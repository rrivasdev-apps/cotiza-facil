import { Resend } from "resend";
import { escapeHtml } from "@/lib/html-escape";
import type { Presupuesto, Template } from "@/lib/types";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendPresupuestoEmail(
  presupuesto: Presupuesto,
  template: Template,
  pdfBuffer: Buffer,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("El envío por correo no está configurado (falta RESEND_API_KEY o RESEND_FROM_EMAIL).");
  }

  const resend = new Resend(apiKey);
  const filenameSafeClient = presupuesto.client_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "cliente";

  const { error } = await resend.emails.send({
    from,
    to: presupuesto.client_email,
    subject: `Presupuesto — ${template.name}`,
    html: `
      <p>Hola ${escapeHtml(presupuesto.client_name)},</p>
      <p>Te enviamos el presupuesto solicitado. Lo encontrás adjunto en este correo, en formato PDF.</p>
      <p>Cualquier consulta, respondé directamente a este correo.</p>
    `,
    attachments: [{ filename: `presupuesto-${filenameSafeClient}.pdf`, content: pdfBuffer }],
  });

  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`);
}
