"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccountRole } from "@/lib/account";

export type Workspace = {
  accountId: string;
  name: string;
  role: AccountRole;
  isActive: boolean;
};

// Lista todos los workspaces a los que pertenece el usuario. Usa el admin
// client para leer los nombres porque la policy de accounts solo deja ver
// el workspace activo; el filtro por user_id sale de la sesión, nunca de
// un parámetro del cliente.
export async function listMyWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const [{ data: memberships }, { data: profile }] = await Promise.all([
    admin
      .from("account_members")
      .select("account_id, role, created_at, accounts(name)")
      .eq("user_id", user.id)
      .order("created_at"),
    admin.from("users").select("active_account_id").eq("id", user.id).single(),
  ]);

  return (memberships ?? []).map((membership) => ({
    accountId: membership.account_id as string,
    name: (membership.accounts as unknown as { name: string } | null)?.name ?? "",
    role: membership.role as AccountRole,
    isActive: membership.account_id === profile?.active_account_id,
  }));
}

// Cambia el workspace activo. La membresía se valida con el cliente del
// usuario (RLS solo le deja ver las suyas); la escritura va por admin
// porque users no tiene policy de update.
export async function setActiveAccount(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!membership) throw new Error("No perteneces a ese workspace.");

  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ active_account_id: accountId }).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
