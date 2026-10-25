"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateWorkspace, getWorkspacesForUser, type Workspace } from "./queries";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");
  return { supabase, user };
}

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const { user } = await requireUser();
  return getWorkspacesForUser(user.id);
}

// Cambia el workspace activo. La membresía se valida con el cliente del
// usuario (RLS solo le deja ver las suyas); la escritura va por admin
// porque users no tiene policy de update.
export async function setActiveAccount(accountId: string) {
  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!membership) throw new Error("No perteneces a ese workspace.");

  await activateWorkspace(user.id, accountId);
  revalidatePath("/", "layout");
}

export async function selectWorkspace(formData: FormData) {
  await setActiveAccount(String(formData.get("account_id") ?? ""));
  redirect("/inicio");
}

// Workspace propio para quien llegó solo como colaborador. Se limita a
// uno propio por persona: el tope de colaboradores y los planes se
// definen por cuenta, y varias cuentas propias lo eludirían.
export async function createOwnWorkspace(_prevState: string | null, formData: FormData) {
  const { user } = await requireUser();
  const name = String(formData.get("account_name") ?? "").trim();
  if (!name) return "El nombre de tu negocio es obligatorio.";

  const workspaces = await getWorkspacesForUser(user.id);
  if (workspaces.some((workspace) => workspace.role === "owner")) {
    return "Ya tienes un workspace propio.";
  }

  const admin = createAdminClient();
  const { data: account, error: accountError } = await admin
    .from("accounts")
    .insert({
      name,
      sender_email: `${name} <presupuestos@mail.simpletechtraining.com>`,
    })
    .select()
    .single();
  if (accountError) return "No se pudo crear el workspace. Intenta de nuevo.";

  const { error: memberError } = await admin
    .from("account_members")
    .insert({ user_id: user.id, account_id: account.id, role: "owner" });
  if (memberError) {
    await admin.from("accounts").delete().eq("id", account.id);
    return "No se pudo crear el workspace. Intenta de nuevo.";
  }

  await activateWorkspace(user.id, account.id);
  revalidatePath("/", "layout");
  redirect("/plantillas");
}
