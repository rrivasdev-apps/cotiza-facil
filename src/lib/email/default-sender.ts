// Remitente por defecto de una cuenta nueva: el dominio verificado en Resend
// es compartido por todas las cuentas, así que solo cambia el nombre
// visible (la cuenta lo puede editar en /cuenta). El dominio sale de
// EMAIL_SENDER_DOMAIN; sin ella se mantiene el que ya estaba en uso.
const FALLBACK_SENDER_DOMAIN = "mail.simpletechtraining.com";

export function defaultSenderEmail(displayName: string): string {
  const domain = process.env.EMAIL_SENDER_DOMAIN?.trim() || FALLBACK_SENDER_DOMAIN;
  return `${displayName} <presupuestos@${domain}>`;
}
