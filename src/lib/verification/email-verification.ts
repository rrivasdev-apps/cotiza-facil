import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvitationToken, hashToken } from "@/lib/colaboradores/invitations";
import { applyPendingActivations } from "@/lib/guaybo/process";

// Sin "use server" a propósito: reciben ids y tokens; como server actions
// quedarían expuestos como endpoints.

export const VERIFICATION_TTL_HOURS = 48;
// Evita usar "reenviar" para disparar correos en ráfaga.
const RESEND_COOLDOWN_SECONDS = 60;

// Crea un token nuevo e invalida los anteriores del usuario. Devuelve null si
// se pidió otro hace menos de RESEND_COOLDOWN_SECONDS.
export async function createVerificationToken(userId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: latest } = await admin
    .from("email_verifications")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest && Date.now() - new Date(latest.created_at as string).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    return null;
  }

  await admin.from("email_verifications").delete().eq("user_id", userId);

  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 3600 * 1000).toISOString();
  const { error } = await admin
    .from("email_verifications")
    .insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
  if (error) throw new Error(error.message);

  return token;
}

// Solo consulta: los escáneres de correo abren los links por su cuenta, así
// que el GET no puede consumir el token (lo hace confirmVerification al
// pulsar el botón).
export async function peekVerification(token: string): Promise<{ userId: string; email: string } | null> {
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_verifications")
    .select("user_id, expires_at, users(email)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!data || new Date(data.expires_at as string) <= new Date()) return null;
  const email = (data.users as unknown as { email: string } | null)?.email;
  return email ? { userId: data.user_id as string, email } : null;
}

// Marca el correo como verificado y aplica las compras que hizo antes de
// registrarse. Borrar la fila del token es el "candado" de un solo uso.
export async function confirmVerification(token: string): Promise<boolean> {
  const verification = await peekVerification(token);
  if (!verification) return false;

  const admin = createAdminClient();
  const { data: consumed } = await admin
    .from("email_verifications")
    .delete()
    .eq("token_hash", hashToken(token))
    .select("id");
  if (!consumed?.length) return false;

  await markEmailVerified(verification.userId, verification.email);
  return true;
}

// Compartido con los caminos donde el propio flujo prueba la casilla (aceptar
// una invitación enviada a ese correo).
export async function markEmailVerified(userId: string, email: string) {
  const admin = createAdminClient();
  await admin.from("users").update({ email_verified_at: new Date().toISOString() }).eq("id", userId);

  // Los planes pendientes van al workspace propio; un colaborador sin
  // workspace propio no tiene a dónde aplicarlos todavía.
  const { data: ownerships } = await admin
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .order("created_at")
    .limit(1);
  const ownAccountId = ownerships?.[0]?.account_id as string | undefined;
  if (ownAccountId) await applyPendingActivations(email, ownAccountId);
}

export async function isEmailVerified(userId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("users").select("email_verified_at").eq("id", userId).single();
  return Boolean(data?.email_verified_at);
}
