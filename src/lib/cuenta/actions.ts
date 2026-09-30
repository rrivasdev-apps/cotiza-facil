"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";

// Mismos dos formatos que Resend acepta como `from` — validar acá
// evita guardar algo que recién falla (con un error genérico de la
// API de Resend) al mandar el primer correo. El espacio antes de "<"
// en "Nombre <email>" es opcional (algunos lo escriben pegado) — no
// hay riesgo de confundirlo con un email suelto porque un email
// suelto nunca lleva "<"/">" (los excluye BARE_EMAIL_RE).
const BARE_EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NAMED_EMAIL_RE = /^.+\s*<([^<>]+)>$/;

function isValidSenderEmail(value: string): boolean {
  const namedMatch = value.match(NAMED_EMAIL_RE);
  const email = namedMatch ? namedMatch[1] : value;
  return BARE_EMAIL_RE.test(email.trim());
}

// Devuelve {error} en vez de lanzar — un throw en un Server Action se
// redacta en producción (React error #441, mensaje real oculto), ver
// la misma corrección ya aplicada en sendPresupuesto/sendPresupuestoHtml.
export async function updateAccountSettings(
  name: string,
  senderEmail: string,
): Promise<{ error?: string }> {
  const trimmedName = name.trim();
  const trimmedSenderEmail = senderEmail.trim();
  if (!trimmedName) return { error: "El nombre es obligatorio." };
  if (trimmedSenderEmail && !isValidSenderEmail(trimmedSenderEmail)) {
    return {
      error: "El correo remitente no tiene un formato válido — usa email@dominio.com o Nombre <email@dominio.com>.",
    };
  }

  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return { error: "No autenticado." };

  const { error } = await supabase
    .from("accounts")
    .update({ name: trimmedName, sender_email: trimmedSenderEmail || null })
    .eq("id", account.accountId);
  if (error) return { error: error.message };

  revalidatePath("/cuenta");
  revalidatePath("/(app)", "layout");
  return {};
}
