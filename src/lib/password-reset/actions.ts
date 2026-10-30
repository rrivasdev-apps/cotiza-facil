"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { defaultSenderEmail } from "@/lib/email/default-sender";
import { getAppUrl } from "@/lib/app-url";
import { consumePasswordReset, createPasswordResetToken, peekPasswordReset } from "./password-reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type PasswordFormState = { error?: string; message?: string } | null;

// Misma respuesta exista o no la cuenta: si no, este formulario serviría
// para averiguar qué correos están registrados.
const SENT_MESSAGE = "Si ese correo tiene una cuenta, te enviamos un enlace para restablecer tu contraseña.";

// En users el correo se guardó como lo escribió la persona (Supabase Auth sí
// lo pasa a minúsculas), así que se compara sin distinguir mayúsculas. Los
// comodines de ilike se escapan para que "a_b@x.com" no coincida con "axb@x.com".
async function findUserByEmail(email: string) {
  const escaped = email.replace(/[\\%_]/g, (char) => `\\${char}`);
  const { data } = await createAdminClient()
    .from("users")
    .select("id, email, accounts:active_account_id(sender_email)")
    .ilike("email", escaped)
    .limit(5);
  return (data ?? []).find((user) => (user.email as string).toLowerCase() === email.toLowerCase()) ?? null;
}

export async function requestPasswordReset(_prevState: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) return { error: "Ingresa un email válido." };

  // Todo lo que depende de que la cuenta exista va después de responder: si
  // se hiciera antes, la demora delataría qué correos están registrados.
  after(async () => {
    try {
      const user = await findUserByEmail(email);
      if (!user) return;
      const token = await createPasswordResetToken(user.id as string);
      if (!token) return;
      const senderEmail =
        (user.accounts as unknown as { sender_email: string | null } | null)?.sender_email ?? defaultSenderEmail("Cotiza Fácil");
      await sendPasswordResetEmail(user.email as string, `${getAppUrl()}/restablecer/${token}`, senderEmail);
    } catch (error) {
      console.error("No se pudo procesar la recuperación de contraseña:", error);
    }
  });

  return { message: SENT_MESSAGE };
}

export async function resetPassword(_prevState: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== passwordConfirm) return { error: "Las contraseñas no coinciden." };

  // Se valida antes de consumir: una contraseña rechazada no debe gastar el enlace.
  if (!(await peekPasswordReset(token))) return { error: "Este enlace ya se usó o venció. Pide uno nuevo." };

  const userId = await consumePasswordReset(token);
  if (!userId) return { error: "Este enlace ya se usó o venció. Pide uno nuevo." };

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  if (error) return { error: "No se pudo cambiar la contraseña. Pide un enlace nuevo e intenta de nuevo." };

  redirect("/login?contrasena=restablecida");
}

// Desde Cuenta, con sesión. Pide la contraseña actual: una sesión abierta y
// desatendida no debería bastar para cambiarla.
export async function changePassword(_prevState: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) return { error: "La contraseña nueva debe tener al menos 8 caracteres." };
  if (password !== passwordConfirm) return { error: "Las contraseñas nuevas no coinciden." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Inicia sesión para continuar." };

  const { error: currentError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (currentError) return { error: "La contraseña actual no es correcta." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No se pudo cambiar la contraseña. Intenta de nuevo." };
  return { message: "Contraseña actualizada." };
}
