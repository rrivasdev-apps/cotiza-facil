// Ruta del asistente de configuración guiada. Vive aparte (sin importar
// nada de servidor) porque la usan el middleware, el login y el correo.
const WIZARD_PATH_RE = /^\/plantillas\/[0-9a-f-]{36}\/asistente$/i;

export function wizardPath(templateId: string): string {
  return `/plantillas/${templateId}/asistente`;
}

// Lista cerrada: el login solo vuelve a ESTA forma de ruta, así "next"
// nunca sirve de redirección abierta a otro sitio.
export function isWizardPath(path: string): boolean {
  return WIZARD_PATH_RE.test(path);
}
