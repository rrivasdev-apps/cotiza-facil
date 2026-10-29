"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createVerificationToken } from "@/lib/verification/email-verification";
import { sendVerificationEmail } from "@/lib/email/resend";
import { getAppUrl } from "@/lib/app-url";
import { defaultSenderEmail } from "@/lib/email/default-sender";

// No hay insert policy de RLS para accounts/users desde el cliente
// (alta hoy vía scripts/seed-account.mjs con service role, ver
// schema.sql) — esta acción hace lo mismo que ese script, pero
// disparada por el propio usuario en vez de un admin a mano.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUp(_prevState: string | null, formData: FormData) {
  const accountName = String(formData.get("account_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!accountName) return "El nombre de tu negocio es obligatorio.";
  if (!EMAIL_RE.test(email)) return "Ingresa un email válido.";
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password !== passwordConfirm) return "Las contraseñas no coinciden.";

  const admin = createAdminClient();

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .insert({
      name: accountName,
      // Remitente por defecto: el dominio verificado en Resend es
      // compartido por todas las cuentas (ver CLAUDE.md), así que lo
      // único que cambia por cuenta es el nombre visible — el usuario
      // lo puede editar después en /cuenta si quiere otro.
      sender_email: defaultSenderEmail(accountName),
    })
    .select()
    .single();
  if (accountError) return "No se pudo crear la cuenta. Intenta de nuevo.";

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) {
    await admin.from("accounts").delete().eq("id", account.id);
    if (authError.message.toLowerCase().includes("already")) {
      return "Ya existe una cuenta con ese email. Inicia sesión en su lugar.";
    }
    return "No se pudo crear el usuario. Intenta de nuevo.";
  }

  const { error: userError } = await admin
    .from("users")
    .insert({ id: authUser.user.id, account_id: account.id, email });
  if (userError) {
    // Sin este link, el auth user y la cuenta quedan huérfanos —
    // deshacemos los dos pasos anteriores.
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("accounts").delete().eq("id", account.id);
    return "No se pudo terminar de crear tu cuenta. Intenta de nuevo.";
  }

  // Si pagó en Guaybo antes de registrarse, el plan se aplica cuando
  // verifique el correo (no ahora): sin esa prueba, cualquiera podría
  // registrarse con el correo de quien pagó y quedarse con su plan.
  // Un fallo de envío no frena el registro; puede reenviarlo desde la app.
  try {
    const token = await createVerificationToken(authUser.user.id);
    if (token) {
      await sendVerificationEmail(email, `${getAppUrl()}/verificar/${token}`, account.sender_email);
    }
  } catch (error) {
    // No se frena el alta (ver arriba), pero queda en el log: un APP_URL
    // o RESEND_API_KEY ausente se vería recién cuando alguien no recibe el correo.
    console.error("No se pudo enviar el correo de verificación:", error);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    redirect("/login");
  }

  redirect("/plantillas");
}
