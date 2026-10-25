import type { SupabaseClient } from "@supabase/supabase-js";
import type { Currency } from "@/lib/types";

export type AccountRole = "owner" | "collaborator";

export async function getCurrentAccount(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("active_account_id, is_platform_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.active_account_id) return null;

  // Se valida contra account_members en vez de confiar en active_account_id:
  // si la membresía ya no existe (colaborador removido), devuelve null y el
  // usuario cae al selector de workspace en lugar de ver un workspace ajeno.
  const { data: membership, error: membershipError } = await supabase
    .from("account_members")
    .select("role, accounts(name, sender_email, default_template_id, currency)")
    .eq("user_id", user.id)
    .eq("account_id", profile.active_account_id)
    .single();

  if (membershipError || !membership) return null;

  const account = membership.accounts as unknown as {
    name: string;
    sender_email: string | null;
    default_template_id: string | null;
    currency: Currency;
  } | null;

  const role = membership.role as AccountRole;

  return {
    accountId: profile.active_account_id as string,
    accountName: account?.name ?? "",
    senderEmail: account?.sender_email ?? null,
    defaultTemplateId: account?.default_template_id ?? null,
    currency: account?.currency ?? "USD",
    userId: user.id,
    userEmail: user.email ?? "",
    isPlatformAdmin: Boolean(profile.is_platform_admin),
    role,
    isOwner: role === "owner",
  };
}
