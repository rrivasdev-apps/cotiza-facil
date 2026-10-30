import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvitationToken, hashToken } from "@/lib/colaboradores/invitations";

// Sin "use server" a propósito: reciben ids y tokens; como server actions
// quedarían expuestos como endpoints.

// Más corto que la verificación de correo (48 h): este token da acceso a la cuenta.
export const PASSWORD_RESET_TTL_MINUTES = 60;
// Evita usar "olvidé mi contraseña" para llenar de correos a alguien.
const REQUEST_COOLDOWN_SECONDS = 60;

// Crea un token nuevo e invalida los anteriores del usuario. Devuelve null si
// se pidió otro hace menos de REQUEST_COOLDOWN_SECONDS.
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: latest } = await admin
    .from("password_resets")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest && Date.now() - new Date(latest.created_at as string).getTime() < REQUEST_COOLDOWN_SECONDS * 1000) {
    return null;
  }

  await admin.from("password_resets").delete().eq("user_id", userId);

  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000).toISOString();
  const { error } = await admin.from("password_resets").insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
  if (error) throw new Error(error.message);

  return token;
}

// Solo consulta: los escáneres de correo abren los links por su cuenta, así
// que el GET no puede consumir el token (lo hace consumePasswordReset al
// pulsar el botón).
export async function peekPasswordReset(token: string): Promise<{ userId: string; email: string } | null> {
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("password_resets")
    .select("user_id, expires_at, users(email)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!data || new Date(data.expires_at as string) <= new Date()) return null;
  const email = (data.users as unknown as { email: string } | null)?.email;
  return email ? { userId: data.user_id as string, email } : null;
}

// Borrar la fila es el "candado" de un solo uso: si dos peticiones llegan a
// la vez, solo una recibe la fila de vuelta.
export async function consumePasswordReset(token: string): Promise<string | null> {
  const reset = await peekPasswordReset(token);
  if (!reset) return null;

  const { data: consumed } = await createAdminClient()
    .from("password_resets")
    .delete()
    .eq("token_hash", hashToken(token))
    .select("id");
  return consumed?.length ? reset.userId : null;
}
