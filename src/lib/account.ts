import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentAccount(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("account_id, accounts(name, sender_email, default_template_id)")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  const account = data.accounts as unknown as {
    name: string;
    sender_email: string | null;
    default_template_id: string | null;
  } | null;

  return {
    accountId: data.account_id as string,
    accountName: account?.name ?? "",
    senderEmail: account?.sender_email ?? null,
    defaultTemplateId: account?.default_template_id ?? null,
    userEmail: user.email ?? "",
  };
}
