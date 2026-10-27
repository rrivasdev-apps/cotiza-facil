"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import { activateWorkspace } from "@/lib/workspaces/queries";
import { PLAN_LABELS, type Plan } from "@/lib/plans";

const SUPPORT_ACCESS_HOURS = 48;

async function requireAccount() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
}

async function requireOwner() {
  const result = await requireAccount();
  if (!result.account.isOwner) throw new Error("Solo el propietario del workspace puede hacer esto.");
  return result;
}

async function requirePlatformAdmin() {
  const { supabase, account } = await requireAccount();
  if (!account.isPlatformAdmin) throw new Error("No autorizado.");
  return { supabase, account };
}

// Lo activa el dueño de la cuenta, desde Cuenta — vence solo a las 48h
// en vez de quedar prendido para siempre, para que no sea una puerta
// que alguien se olvida abierta.
export async function enableSupportAccess() {
  const { supabase, account } = await requireOwner();
  const until = new Date(Date.now() + SUPPORT_ACCESS_HOURS * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("accounts").update({ support_access_until: until }).eq("id", account.accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/cuenta");
}

export async function disableSupportAccess() {
  const { supabase, account } = await requireOwner();
  const { error } = await supabase.from("accounts").update({ support_access_until: null }).eq("id", account.accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/cuenta");
}

export type SupportEligibleAccount = {
  accountId: string;
  accountName: string;
  userEmail: string;
  supportAccessUntil: string;
};

// Solo para el panel /soporte — usa el cliente admin porque necesita
// ver cuentas de CUALQUIER usuario, no solo la propia (RLS normal
// nunca dejaría ver esto).
export async function listSupportAccounts(): Promise<SupportEligibleAccount[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  // Se parte de account_members (y no de accounts → users) porque accounts
  // tiene dos relaciones con users (account_id y active_account_id) y el
  // embed directo sería ambiguo. El usuario de contacto es el propietario.
  const { data, error } = await admin
    .from("account_members")
    .select("account_id, users(email), accounts!inner(name, support_access_until)")
    .eq("role", "owner")
    .not("accounts.support_access_until", "is", null)
    .gt("accounts.support_access_until", new Date().toISOString());
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const user = row.users as unknown as { email: string } | null;
      const account = row.accounts as unknown as { name: string; support_access_until: string };
      return {
        accountId: row.account_id as string,
        accountName: account.name,
        userEmail: user?.email ?? "",
        supportAccessUntil: account.support_access_until,
      };
    })
    .sort((a, b) => a.supportAccessUntil.localeCompare(b.supportAccessUntil));
}

export type AccountPlanRow = {
  accountId: string;
  accountName: string;
  ownerEmail: string;
  collaborators: number;
  plan: Plan;
  planExpiresAt: string | null;
  maxCollaborators: number;
};

// Todas las cuentas (no solo las con acceso de soporte): el plan lo fija
// el admin de la plataforma mientras la activación sea manual.
export async function listAccountPlans(): Promise<AccountPlanRow[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const [{ data: accounts, error: accountsError }, { data: members, error: membersError }] = await Promise.all([
    admin.from("accounts").select("id, name, plan, plan_expires_at, max_collaborators").order("name"),
    admin.from("account_members").select("account_id, role, users(email)"),
  ]);
  if (accountsError) throw new Error(accountsError.message);
  if (membersError) throw new Error(membersError.message);

  return (accounts ?? []).map((row) => {
    const accountMembers = (members ?? []).filter((member) => member.account_id === row.id);
    const owner = accountMembers.find((member) => member.role === "owner");
    return {
      accountId: row.id as string,
      accountName: row.name as string,
      ownerEmail: (owner?.users as unknown as { email: string } | null)?.email ?? "",
      collaborators: accountMembers.filter((member) => member.role === "collaborator").length,
      plan: row.plan as Plan,
      planExpiresAt: row.plan_expires_at as string | null,
      maxCollaborators: row.max_collaborators as number,
    };
  });
}

// expiresAt: fecha ISO (o null = sin vencimiento). maxCollaborators solo
// cuenta en "fundador"; en el resto el tope sale del plan.
export async function setAccountPlan(accountId: string, plan: Plan, expiresAt: string | null, maxCollaborators: number) {
  await requirePlatformAdmin();
  if (!(plan in PLAN_LABELS)) throw new Error("Plan inválido.");
  if (!Number.isInteger(maxCollaborators) || maxCollaborators < 0 || maxCollaborators > 1000) {
    throw new Error("El tope de colaboradores debe ser un entero entre 0 y 1000.");
  }
  if (expiresAt !== null && Number.isNaN(new Date(expiresAt).getTime())) throw new Error("Fecha de vencimiento inválida.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("accounts")
    .update({
      plan,
      // Gratis y fundador no vencen.
      plan_expires_at: plan === "pionero_mensual" || plan === "pionero_anual" ? expiresAt : null,
      max_collaborators: maxCollaborators,
    })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/soporte");
}

// Genera un link de acceso de un solo uso para el usuario de la
// cuenta elegida (sin necesitar su contraseña) y deja constancia en
// support_sessions. El link se redime en /soporte/entrar, que corre
// FUERA del grupo (app) — todavía no hay sesión en la ventana de
// incógnito donde se va a abrir.
export async function enterAsAccount(accountId: string): Promise<{ url: string }> {
  const { account } = await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: targetAccount, error: accountError } = await admin
    .from("accounts")
    .select("support_access_until")
    .eq("id", accountId)
    .single();
  if (accountError || !targetAccount) throw new Error("Cuenta no encontrada.");
  if (!targetAccount.support_access_until || new Date(targetAccount.support_access_until) <= new Date()) {
    throw new Error("Esta cuenta no tiene acceso de soporte activo.");
  }

  // Se entra como el propietario de la cuenta (no un colaborador, que
  // vería menos), y se deja su workspace activo apuntando a esa cuenta:
  // si estuviera trabajando en otro, la sesión impersonada abriría el
  // equivocado.
  const { data: ownerMembership, error: userError } = await admin
    .from("account_members")
    .select("user_id, users(email)")
    .eq("account_id", accountId)
    .eq("role", "owner")
    .limit(1)
    .single();
  const targetUser = ownerMembership?.users as unknown as { email: string } | null;
  if (userError || !ownerMembership || !targetUser) throw new Error("No se encontró un usuario para esta cuenta.");
  await activateWorkspace(ownerMembership.user_id as string, accountId);

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetUser.email,
  });
  if (linkError || !linkData) throw new Error(linkError?.message ?? "No se pudo generar el acceso.");

  const { error: logError } = await admin.from("support_sessions").insert({
    account_id: accountId,
    admin_user_id: account.userId,
  });
  if (logError) throw new Error(logError.message);

  const tokenHash = linkData.properties.hashed_token;
  return { url: `/soporte/entrar?token_hash=${encodeURIComponent(tokenHash)}` };
}

// Termina la sesión impersonada (la ventana de incógnito) y limpia el
// aviso de "Modo soporte" — no tiene nada que ver con la sesión del
// admin en su propia ventana, esa nunca se tocó.
export async function exitSupportMode() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("support_mode");
  redirect("/login");
}
