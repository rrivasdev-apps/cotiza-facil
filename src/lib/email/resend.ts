import { Resend } from "resend";
import { escapeHtml } from "@/lib/html-escape";
import { INVITATION_TTL_DAYS } from "@/lib/colaboradores/invitations";
import { VERIFICATION_TTL_HOURS } from "@/lib/verification/email-verification";
import type { Presupuesto, Template } from "@/lib/types";

// La API key es un secreto de plataforma (una sola cuenta de Resend para
// toda la consola), pero el remitente es por cuenta — cada negocio
// manda desde su propia dirección, configurada en /cuenta. RESEND_FROM_EMAIL
// queda solo como fallback opcional para desarrollo/pruebas.
export function isEmailConfigured(senderEmail: string | null): boolean {
  return Boolean(process.env.RESEND_API_KEY && (senderEmail || process.env.RESEND_FROM_EMAIL));
}

export async function sendInvitationEmail(
  to: string,
  accountName: string,
  inviterEmail: string,
  inviteUrl: string,
  senderEmail: string | null,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = senderEmail || process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("El envío por correo no está configurado.");
  }

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    subject: `${accountName} te invitó a colaborar en Cotiza Fácil`,
    html: `
      <p>Hola,</p>
      <p>${escapeHtml(inviterEmail)} te invitó a colaborar en el workspace <strong>${escapeHtml(accountName)}</strong> de Cotiza Fácil, para crear y enviar presupuestos.</p>
      <p><a href="${escapeHtml(inviteUrl)}">Aceptar invitación</a></p>
      <p>El enlace vence en ${INVITATION_TTL_DAYS} días. Si no esperabas esta invitación, ignora este correo.</p>
    `,
  });

  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`);
}

export async function sendVerificationEmail(to: string, verifyUrl: string, senderEmail: string | null): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = senderEmail || process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("El envío por correo no está configurado.");
  }

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    subject: "Confirma tu correo en Cotiza Fácil",
    html: `
      <p>Hola,</p>
      <p>Confirma tu correo para terminar de activar tu cuenta de Cotiza Fácil.</p>
      <p><a href="${escapeHtml(verifyUrl)}">Confirmar mi correo</a></p>
      <p>El enlace vence en ${VERIFICATION_TTL_HOURS} horas. Si no creaste esta cuenta, ignora este correo.</p>
    `,
  });

  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`);
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
  // Link a /aprobar/<id> — el cliente lo usa para aprobar sin login.
  // Va en el cuerpo (acá abajo si html no vino armado ya con el suyo
  // propio desde renderPresupuestoEmailHtml).
  approvalUrl?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = senderEmail || process.env.RESEND_FROM_EMAIL;
  if (!apiKey) {
    throw new Error("El envío por correo no está configurado (falta RESEND_API_KEY).");
  }
  if (!from) {
    throw new Error("Configura tu correo remitente en Cuenta antes de enviar presupuestos.");
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
      <p>Te enviamos el presupuesto solicitado. Lo encuentras adjunto en este correo, en formato PDF.</p>
      ${approvalUrl ? `<p><a href="${escapeHtml(approvalUrl)}">Aprobar presupuesto</a></p>` : ""}
      <p>Cualquier consulta, responde directamente a este correo.</p>
    `,
    attachments: [{ filename: `presupuesto-${filenameSafeClient}.pdf`, content: pdfBuffer }],
  });

  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`);
}
