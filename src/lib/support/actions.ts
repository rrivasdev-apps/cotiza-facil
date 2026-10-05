"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";

const SUPPORT_ACCESS_HOURS = 48;

async function requireAccount() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
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
  const { supabase, account } = await requireAccount();
  const until = new Date(Date.now() + SUPPORT_ACCESS_HOURS * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("accounts").update({ support_access_until: until }).eq("id", account.accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/cuenta");
}

export async function disableSupportAccess() {
  const { supabase, account } = await requireAccount();
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

  const { data, error } = await admin
    .from("accounts")
    .select("id, name, support_access_until, users(email)")
    .not("support_access_until", "is", null)
    .gt("support_access_until", new Date().toISOString())
    .order("support_access_until");
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const users = row.users as unknown as { email: string }[];
    return {
      accountId: row.id as string,
      accountName: row.name as string,
      userEmail: users?.[0]?.email ?? "",
      supportAccessUntil: row.support_access_until as string,
    };
  });
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

  const { data: targetUser, error: userError } = await admin
    .from("users")
    .select("email")
    .eq("account_id", accountId)
    .limit(1)
    .single();
  if (userError || !targetUser) throw new Error("No se encontró un usuario para esta cuenta.");

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
