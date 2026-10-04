import type { FieldCatalogEntry, PresupuestoData } from "@/lib/types";

// Tokens especiales para referenciar el cliente del presupuesto (nombre,
// correo, teléfono, dirección) desde una "línea combinada" en
// cualquier sección que las admita (tabla_datos, cláusulas, cierre,
// título, dos columnas) — mismo mecanismo sintético que sectionTotalField
// (ver presupuesto-items.ts) para el Total General de una tabla_items:
// un FieldCatalogEntry falso con id fijo, que renderCompositeTemplate
// resuelve igual que un campo real del catálogo. No viven en
// presupuesto.data (a diferencia del Total General, que sí se
// persiste ahí) — se mezclan recién al renderizar, leyendo siempre los
// client_name/client_email/client_phone/client_address ya guardados en
// la fila, la fuente de verdad real de esos valores.
export const CLIENT_NAME_FIELD_ID = "client:name";
export const CLIENT_EMAIL_FIELD_ID = "client:email";
export const CLIENT_PHONE_FIELD_ID = "client:phone";
export const CLIENT_ADDRESS_FIELD_ID = "client:address";

export const CLIENT_PSEUDO_FIELDS: FieldCatalogEntry[] = [
  {
    id: CLIENT_NAME_FIELD_ID,
    account_id: "",
    name: "Nombre del cliente",
    data_type: "texto_corto",
    use_saved_values: false,
    help_text: null,
    created_at: "",
  },
  {
    id: CLIENT_EMAIL_FIELD_ID,
    account_id: "",
    name: "Correo del cliente",
    data_type: "texto_corto",
    use_saved_values: false,
    help_text: null,
    created_at: "",
  },
  {
    id: CLIENT_PHONE_FIELD_ID,
    account_id: "",
    name: "Teléfono del cliente",
    data_type: "texto_corto",
    use_saved_values: false,
    help_text: null,
    created_at: "",
  },
  {
    id: CLIENT_ADDRESS_FIELD_ID,
    account_id: "",
    name: "Dirección del cliente",
    data_type: "texto_corto",
    use_saved_values: false,
    help_text: null,
    created_at: "",
  },
];

export function buildClientFieldsSeed(
  clientName: string,
  clientEmail: string,
  clientPhone: string | null,
  clientAddress: string | null,
): PresupuestoData {
  return {
    [CLIENT_NAME_FIELD_ID]: clientName,
    [CLIENT_EMAIL_FIELD_ID]: clientEmail,
    [CLIENT_PHONE_FIELD_ID]: clientPhone ?? "",
    [CLIENT_ADDRESS_FIELD_ID]: clientAddress ?? "",
  };
}
