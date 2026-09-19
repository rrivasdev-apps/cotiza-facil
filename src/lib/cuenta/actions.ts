"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";

export async function updateAccountSettings(name: string, senderEmail: string) {
  const trimmedName = name.trim();
  const trimmedSenderEmail = senderEmail.trim();
  if (!trimmedName) throw new Error("El nombre es obligatorio.");

  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");

  const { error } = await supabase
    .from("accounts")
    .update({ name: trimmedName, sender_email: trimmedSenderEmail || null })
    .eq("id", account.accountId);
  if (error) throw new Error(error.message);

  revalidatePath("/cuenta");
  revalidatePath("/(app)", "layout");
}
