import { Resend } from "resend";
import { escapeHtml } from "@/lib/html-escape";
import type { Presupuesto, Template } from "@/lib/types";

// La API key es un secreto de plataforma (una sola cuenta de Resend para
// toda la consola), pero el remitente es por cuenta — cada negocio
// manda desde su propia dirección, configurada en /cuenta. RESEND_FROM_EMAIL
// queda solo como fallback opcional para desarrollo/pruebas.
export function isEmailConfigured(senderEmail: string | null): boolean {
  return Boolean(process.env.RESEND_API_KEY && (senderEmail || process.env.RESEND_FROM_EMAIL));
}

export async function sendPresupuestoEmail(
  presupuesto: Presupuesto,
  template: Template,
  pdfBuffer: Buffer,
  senderEmail: string | null,
  // Cuerpo alternativo (la versión "con diseño" armada por
  // renderPresupuestoEmailHtml) — si no se pasa, va el texto plano de
  // siempre. En ambos casos el PDF sigue yendo adjunto.
  html?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = senderEmail || process.env.RESEND_FROM_EMAIL;
  if (!apiKey) {
    throw new Error("El envío por correo no está configurado (falta RESEND_API_KEY).");
  }
  if (!from) {
    throw new Error("Configurá tu correo remitente en Cuenta antes de enviar presupuestos.");
  }

  const resend = new Resend(apiKey);
  const filenameSafeClient = presupuesto.client_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "cliente";

  const { error } = await resend.emails.send({
    from,
    to: presupuesto.client_email,
    subject: `Presupuesto — ${template.name}`,
    html:
      html ??
      `
      <p>Hola ${escapeHtml(presupuesto.client_name)},</p>
      <p>Te enviamos el presupuesto solicitado. Lo encontrás adjunto en este correo, en formato PDF.</p>
      <p>Cualquier consulta, respondé directamente a este correo.</p>
    `,
    attachments: [{ filename: `presupuesto-${filenameSafeClient}.pdf`, content: pdfBuffer }],
  });

  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`);
}
