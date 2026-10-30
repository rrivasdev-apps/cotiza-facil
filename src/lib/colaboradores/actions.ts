"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import { collaboratorLimit, type Plan } from "@/lib/plans";
import { sendInvitationEmail, isEmailConfigured } from "@/lib/email/resend";
import { activateWorkspace } from "@/lib/workspaces/queries";
import { markEmailVerified } from "@/lib/verification/email-verification";
import {
  INVITATION_TTL_DAYS,
  claimInvitation,
  findValidInvitation,
  generateInvitationToken,
  getSeatUsage,
  releaseInvitation,
} from "./invitations";
import { getAppUrl } from "@/lib/app-url";
import { LEGAL } from "@/lib/legal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireOwner() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  if (!account.isOwner) throw new Error("Solo el propietario del workspace puede hacer esto.");
  return { supabase, account };
}

export type CollaboratorsOverview = {
  max: number;
  collaborators: { userId: string; email: string }[];
  invitations: { id: string; email: string; expiresAt: string }[];
};

export async function getCollaboratorsOverview(): Promise<CollaboratorsOverview> {
  const { supabase, account } = await requireOwner();

  const [{ data: account_row }, { data: members }, { data: invitations }] = await Promise.all([
    supabase.from("accounts").select("plan, plan_expires_at, max_collaborators").eq("id", account.accountId).single(),
    supabase
      .from("account_members")
      .select("user_id, users(email)")
      .eq("account_id", account.accountId)
      .eq("role", "collaborator"),
    supabase
      .from("account_invitations")
      .select("id, email, expires_at")
      .eq("account_id", account.accountId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at"),
  ]);

  return {
    max: account_row
      ? collaboratorLimit(
          account_row.plan as Plan,
          account_row.plan_expires_at as string | null,
          account_row.max_collaborators as number,
        )
      : 0,
    collaborators: (members ?? []).map((member) => ({
      userId: member.user_id as string,
      email: (member.users as unknown as { email: string } | null)?.email ?? "",
    })),
    invitations: (invitations ?? []).map((invitation) => ({
      id: invitation.id as string,
      email: invitation.email as string,
      expiresAt: invitation.expires_at as string,
    })),
  };
}

// Devuelve el link además de mandarlo por correo: es el único momento en
// que existe el token crudo, y si el correo falla (remitente sin
// verificar, destinatario rebotado) el propietario aún puede compartirlo.
export async function inviteCollaborator(
  emailRaw: string,
): Promise<{ error: string } | { inviteUrl: string; emailSent: boolean; emailError?: string }> {
  const { account } = await requireOwner();
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Ingresa un email válido." };
  if (email === account.userEmail.toLowerCase()) return { error: "Ese es tu propio correo." };

  const admin = createAdminClient();

  const { data: existingMember } = await admin
    .from("account_members")
    .select("user_id, users!inner(email)")
    .eq("account_id", account.accountId)
    .eq("users.email", email)
    .maybeSingle();
  if (existingMember) return { error: "Esa persona ya pertenece a tu workspace." };

  const seats = await getSeatUsage(account.accountId);
  if (seats.collaborators + seats.pending >= seats.max) {
    return {
      error: `Tu workspace permite ${seats.max} colaborador${seats.max === 1 ? "" : "es"} (contando invitaciones pendientes). Contáctanos para ampliar el límite.`,
    };
  }

  const { token, tokenHash } = generateInvitationToken();
  const { error: insertError } = await admin.from("account_invitations").insert({
    account_id: account.accountId,
    email,
    token_hash: tokenHash,
    invited_by: account.userId,
    expires_at: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (insertError) {
    // El índice único parcial impide dos pendientes para el mismo email.
    if (insertError.code === "23505") return { error: "Ya hay una invitación pendiente para ese correo." };
    return { error: "No se pudo crear la invitación. Intenta de nuevo." };
  }

  const inviteUrl = `${getAppUrl()}/invitacion/${token}`;
  revalidatePath("/cuenta");

  if (!isEmailConfigured(account.senderEmail)) {
    return { inviteUrl, emailSent: false, emailError: "El envío por correo no está configurado." };
  }
  try {
    await sendInvitationEmail(email, account.accountName, account.userEmail, inviteUrl, account.senderEmail);
    return { inviteUrl, emailSent: true };
  } catch (error) {
    return { inviteUrl, emailSent: false, emailError: error instanceof Error ? error.message : "No se pudo enviar." };
  }
}

export async function revokeInvitation(invitationId: string) {
  const { account } = await requireOwner();
  const admin = createAdminClient();
  const { error } = await admin
    .from("account_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("account_id", account.accountId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  revalidatePath("/cuenta");
}

export async function removeCollaborator(userId: string) {
  const { account } = await requireOwner();
  const admin = createAdminClient();

  const { error } = await admin
    .from("account_members")
    .delete()
    .eq("account_id", account.accountId)
    .eq("user_id", userId)
    .eq("role", "collaborator");
  if (error) throw new Error(error.message);

  // Si estaba trabajando en este workspace, lo mueve a otro suyo (o a
  // ninguno, y el layout lo manda al selector).
  const { data: profile } = await admin.from("users").select("active_account_id").eq("id", userId).single();
  if (profile?.active_account_id === account.accountId) {
    const { data: remaining } = await admin
      .from("account_members")
      .select("account_id")
      .eq("user_id", userId)
      .order("created_at")
      .limit(1);
    await admin
      .from("users")
      .update({ active_account_id: remaining?.[0]?.account_id ?? null })
      .eq("id", userId);
  }

  revalidatePath("/cuenta");
}

// --- Aceptación (la usa la página pública /invitacion/[token]) -----------

async function addCollaborator(invitation: { id: string; accountId: string }, userId: string): Promise<string | null> {
  const seats = await getSeatUsage(invitation.accountId);
  if (seats.collaborators >= seats.max) {
    return "Este workspace alcanzó su límite de colaboradores. Pídele al propietario que lo amplíe.";
  }
  if (!(await claimInvitation(invitation.id))) return "Esta invitación ya se usó o venció.";

  const admin = createAdminClient();
  const { error } = await admin
    .from("account_members")
    .upsert(
      { user_id: userId, account_id: invitation.accountId, role: "collaborator" },
      { onConflict: "user_id,account_id", ignoreDuplicates: true },
    );
  if (error) {
    await releaseInvitation(invitation.id);
    return "No se pudo unirte al workspace. Intenta de nuevo.";
  }

  await activateWorkspace(userId, invitation.accountId);
  return null;
}

export async function acceptInvitation(_prevState: string | null, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Inicia sesión para aceptar la invitación.";

  const invitation = await findValidInvitation(token);
  if (!invitation) return "Esta invitación ya se usó o venció.";
  if ((user.email ?? "").toLowerCase() !== invitation.email.toLowerCase()) {
    return `Esta invitación es para ${invitation.email}. Cierra sesión e ingresa con ese correo.`;
  }

  const error = await addCollaborator(invitation, user.id);
  if (error) return error;

  // El token llegó a esa casilla y el correo de la sesión coincide: queda probado.
  await markEmailVerified(user.id, invitation.email);

  revalidatePath("/", "layout");
  redirect("/inicio");
}

// Para quien no tiene cuenta: se crea solo el usuario (sin workspace
// propio; puede crear uno después desde el selector). El email queda
// confirmado porque recibió el link en esa misma casilla.
export async function acceptInvitationWithSignup(_prevState: string | null, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password !== passwordConfirm) return "Las contraseñas no coinciden.";
  if (formData.get("accept_terms") !== "on") return "Debes aceptar los términos y la política de privacidad.";

  const invitation = await findValidInvitation(token);
  if (!invitation) return "Esta invitación ya se usó o venció.";

  const admin = createAdminClient();
  const email = invitation.email.toLowerCase();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) {
    if (authError.message.toLowerCase().includes("already")) {
      return "Ya existe una cuenta con ese correo. Inicia sesión para aceptar la invitación.";
    }
    return "No se pudo crear tu usuario. Intenta de nuevo.";
  }

  const { error: userError } = await admin
    .from("users")
    .insert({
      id: authUser.user.id,
      email,
      email_verified_at: new Date().toISOString(),
      terms_accepted_at: new Date().toISOString(),
      terms_accepted_version: LEGAL.version,
    });
  if (userError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return "No se pudo terminar de crear tu usuario. Intenta de nuevo.";
  }

  const joinError = await addCollaborator(invitation, authUser.user.id);
  if (joinError) {
    // Sin esto quedaría un usuario sin ningún workspace para una
    // invitación que no se pudo usar.
    await admin.auth.admin.deleteUser(authUser.user.id);
    return joinError;
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect("/login");

  redirect("/inicio");
}
