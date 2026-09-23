"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";

// Mismos dos formatos que Resend acepta como `from` — validar acá
// evita guardar algo que recién falla (con un error genérico de la
// API de Resend) al mandar el primer correo. "Nombre <email>" es el
// único caso con espacio antes de "<", para no confundir un email
// suelto con espacios raros por un display name mal armado.
const BARE_EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NAMED_EMAIL_RE = /^.+\s<([^<>]+)>$/;

function isValidSenderEmail(value: string): boolean {
  const namedMatch = value.match(NAMED_EMAIL_RE);
  const email = namedMatch ? namedMatch[1] : value;
  return BARE_EMAIL_RE.test(email.trim());
}

export async function updateAccountSettings(name: string, senderEmail: string) {
  const trimmedName = name.trim();
  const trimmedSenderEmail = senderEmail.trim();
  if (!trimmedName) throw new Error("El nombre es obligatorio.");
  if (trimmedSenderEmail && !isValidSenderEmail(trimmedSenderEmail)) {
    throw new Error("El correo remitente no tiene un formato válido — usá email@dominio.com o Nombre <email@dominio.com>.");
  }

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
