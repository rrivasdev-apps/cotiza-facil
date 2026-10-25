import { createAdminClient } from "@/lib/supabase/admin";
import type { AccountRole } from "@/lib/account";

// Sin "use server" a propósito: estas funciones reciben un userId, y si
// fueran server actions cualquier cliente podría llamarlas con el id de
// otra persona. Solo se importan desde código server que ya autenticó.

export type Workspace = {
  accountId: string;
  name: string;
  role: AccountRole;
  isActive: boolean;
};

// Usa el admin client porque la policy de accounts solo deja ver el
// workspace activo, y aquí hace falta el nombre de todos.
export async function getWorkspacesForUser(userId: string): Promise<Workspace[]> {
  const admin = createAdminClient();
  const [{ data: memberships }, { data: profile }] = await Promise.all([
    admin
      .from("account_members")
      .select("account_id, role, created_at, accounts(name)")
      .eq("user_id", userId)
      .order("created_at"),
    admin.from("users").select("active_account_id").eq("id", userId).single(),
  ]);

  return (memberships ?? []).map((membership) => ({
    accountId: membership.account_id as string,
    name: (membership.accounts as unknown as { name: string } | null)?.name ?? "",
    role: membership.role as AccountRole,
    isActive: membership.account_id === profile?.active_account_id,
  }));
}

export async function activateWorkspace(userId: string, accountId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ active_account_id: accountId }).eq("id", userId);
  if (error) throw new Error(error.message);
}
