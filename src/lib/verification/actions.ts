"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVerificationEmail } from "@/lib/email/resend";
import { confirmVerification, createVerificationToken } from "./email-verification";
import { getAppUrl } from "@/lib/app-url";

// Botón "Reenviar" del aviso en la app.
export async function resendVerificationEmail(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return "Inicia sesión para continuar.";

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("email_verified_at, accounts:active_account_id(sender_email)")
    .eq("id", user.id)
    .single();
  if (profile?.email_verified_at) return "Tu correo ya está verificado.";

  const token = await createVerificationToken(user.id);
  if (!token) return "Ya te enviamos un correo hace un momento. Espera un minuto y vuelve a intentar.";

  const senderEmail = (profile?.accounts as unknown as { sender_email: string | null } | null)?.sender_email ?? null;
  try {
    await sendVerificationEmail(user.email, `${getAppUrl()}/verificar/${token}`, senderEmail);
  } catch {
    return "No se pudo enviar el correo. Intenta de nuevo más tarde.";
  }
  return `Te enviamos un correo a ${user.email}.`;
}

// Lo dispara el botón de /verificar/[token] (nunca el simple GET, ver
// peekVerification).
export async function confirmEmail(_prevState: string | null, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!(await confirmVerification(token))) return "Este enlace ya se usó o venció. Pide uno nuevo desde la app.";
  redirect("/inicio");
}
