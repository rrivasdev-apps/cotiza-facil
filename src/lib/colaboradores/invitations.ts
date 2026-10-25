import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Sin "use server" a propósito: son helpers internos que reciben tokens e
// ids; como server actions quedarían expuestos como endpoints.

export const INVITATION_TTL_DAYS = 7;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// El token crudo solo existe en el link del correo (y en la respuesta de
// quien invita); en la base queda únicamente su hash, así que una fuga de
// la tabla no permite aceptar invitaciones.
export function generateInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export type ValidInvitation = {
  id: string;
  accountId: string;
  accountName: string;
  email: string;
};

export async function findValidInvitation(token: string): Promise<ValidInvitation | null> {
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("account_invitations")
    .select("id, account_id, email, status, expires_at, accounts(name)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!data || data.status !== "pending" || new Date(data.expires_at as string) <= new Date()) return null;

  return {
    id: data.id as string,
    accountId: data.account_id as string,
    accountName: (data.accounts as unknown as { name: string } | null)?.name ?? "",
    email: data.email as string,
  };
}

export async function getSeatUsage(accountId: string) {
  const admin = createAdminClient();
  const [{ data: account }, { count: collaborators }, { count: pending }] = await Promise.all([
    admin.from("accounts").select("max_collaborators").eq("id", accountId).single(),
    admin
      .from("account_members")
      .select("user_id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("role", "collaborator"),
    admin
      .from("account_invitations")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);

  return {
    max: (account?.max_collaborators as number | undefined) ?? 0,
    collaborators: collaborators ?? 0,
    pending: pending ?? 0,
  };
}

// Marca la invitación como aceptada solo si seguía pendiente: es el
// "candado" que impide usar el mismo link dos veces a la vez.
export async function claimInvitation(invitationId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("account_invitations")
    .update({ status: "accepted" })
    .eq("id", invitationId)
    .eq("status", "pending")
    .select("id");
  return (data?.length ?? 0) === 1;
}

export async function releaseInvitation(invitationId: string) {
  const admin = createAdminClient();
  await admin.from("account_invitations").update({ status: "pending" }).eq("id", invitationId);
}
