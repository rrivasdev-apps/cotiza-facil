"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import type { Cliente } from "@/lib/types";

async function requireAccount() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
}

export async function createCliente(
  name: string,
  email: string,
  phone: string = "",
  address: string = "",
): Promise<Cliente> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (!trimmedName) throw new Error("El nombre es obligatorio.");
  if (!trimmedEmail) throw new Error("El correo es obligatorio.");

  const { supabase, account } = await requireAccount();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      account_id: account.accountId,
      name: trimmedName,
      email: trimmedEmail,
      phone: phone.trim() || null,
      address: address.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya hay un cliente con ese correo.");
    throw new Error(error.message);
  }
  revalidatePath("/clientes");
  revalidatePath("/presupuestos/new");
  return data as Cliente;
}

export async function updateCliente(
  clienteId: string,
  name: string,
  email: string,
  phone: string = "",
  address: string = "",
) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (!trimmedName) throw new Error("El nombre es obligatorio.");
  if (!trimmedEmail) throw new Error("El correo es obligatorio.");

  const { supabase } = await requireAccount();
  const { error } = await supabase
    .from("clientes")
    .update({
      name: trimmedName,
      email: trimmedEmail,
      phone: phone.trim() || null,
      address: address.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clienteId);

  if (error) {
    if (error.code === "23505") throw new Error("Ya hay un cliente con ese correo.");
    throw new Error(error.message);
  }
  revalidatePath("/clientes");
  revalidatePath("/presupuestos/new");
}

// Sin bloqueo tipo "está en uso" (a diferencia de deleteCatalogField):
// presupuestos.client_id es on delete set null — borrar un cliente
// nunca rompe ni bloquea los presupuestos ya hechos con él (ver nota
// en la migración), solo desvincula la referencia.
export async function deleteCliente(clienteId: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath("/clientes");
  revalidatePath("/presupuestos/new");
}
