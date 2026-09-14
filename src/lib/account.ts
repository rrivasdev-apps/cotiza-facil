import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentAccount(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("account_id, accounts(name)")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    accountId: data.account_id as string,
    accountName: (data.accounts as unknown as { name: string } | null)?.name ?? "",
    userEmail: user.email ?? "",
  };
}
