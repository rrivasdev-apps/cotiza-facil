// Datos que cambian el texto de /terminos y /privacidad. Los corchetes son
// pendientes: completarlos con el abogado y poner isDraft en false antes de
// presentar estas páginas como definitivas.
export const LEGAL = {
  isDraft: true,
  // Se guarda en users.terms_accepted_version al registrarse; súbela cada
  // vez que los textos cambien de fondo (no por una corrección de tipeo).
  version: "2026-10-30",
  lastUpdated: "30 de octubre de 2026",
  entityName: "[RAZÓN SOCIAL / NOMBRE DEL TITULAR]",
  contactEmail: "[CORREO DE CONTACTO]",
  jurisdiction: "[PAÍS / JURISDICCIÓN APLICABLE]",
  dataRegion: "[REGIÓN DE LOS SERVIDORES]",
};
