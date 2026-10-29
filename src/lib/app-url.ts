// URL pública de la app, usada en todo link que sale hacia afuera (correos,
// WhatsApp, CRM). Falla fuerte si falta: antes un APP_URL ausente producía
// links "undefined/aprobar/..." que nadie notaba hasta que un cliente
// los abría.
export function getAppUrl(): string {
  const raw = process.env.APP_URL?.trim();
  if (!raw) throw new Error("Falta la variable de entorno APP_URL (la URL pública de la app, p. ej. https://cotiza.tudominio.com).");
  return raw.replace(/\/+$/, "");
}
