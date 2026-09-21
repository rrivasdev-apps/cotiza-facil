import type { FieldCatalogEntry, PresupuestoItem, SectionType } from "@/lib/types";

export function lineTotal(item: PresupuestoItem): number {
  const cantidad = Number(item.cantidad);
  const precio = Number(item.precioUnitario);
  if (!Number.isFinite(cantidad) || !Number.isFinite(precio)) return 0;
  return cantidad * precio;
}

export function grandTotal(items: PresupuestoItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

// Mismo formato $ que el resto de los valores moneda de la app
// (formatFieldValue/formatValue/formatFieldPlain).
export function formatMoney(n: number): string {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function formatQuantity(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? n.toLocaleString("es-AR") : raw;
}

// El Total General de una sección "tabla_items" no vive en field_catalog
// (no es un campo real, nadie lo tipea) — pero para poder referenciarlo
// desde "valor en letras", una fórmula o una línea combinada, igual que
// un campo cualquiera, se lo representa como un FieldCatalogEntry
// sintético. Su id ("section-total:<sectionId>") se guarda en
// presupuesto.data como si fuera el valor de un campo más — ver
// buildPresupuestoData en presupuestos/actions.ts.
export function sectionTotalFieldId(sectionId: string): string {
  return `section-total:${sectionId}`;
}

export function isSectionTotalFieldId(id: string): boolean {
  return id.startsWith("section-total:");
}

export function sectionTotalField(sectionId: string, sectionTitle: string): FieldCatalogEntry {
  return {
    id: sectionTotalFieldId(sectionId),
    account_id: "",
    name: `${sectionTitle} — Total General`,
    data_type: "moneda",
    created_at: "",
  };
}

export function collectSectionTotalFields(
  sections: { id: string; title: string; type: SectionType }[],
): FieldCatalogEntry[] {
  return sections.filter((s) => s.type === "tabla_items").map((s) => sectionTotalField(s.id, s.title));
}
