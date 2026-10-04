import { randomUUID } from "crypto";
import type { PageWithSections, Presupuesto, PresupuestoData, PresupuestoItems, Template } from "@/lib/types";
import { evaluateFormula } from "@/lib/formula";
import { numberToWordsEs } from "@/lib/number-to-words";
import { formatMoney, grandTotal, sectionTotalFieldId } from "@/lib/presupuesto-items";
import { sampleForField, sampleItems } from "./gallery-preview";

const SAMPLE_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";

// Mismo propósito que buildGalleryPreviewDocument, pero para una
// plantilla real que una cuenta está armando en el editor (no una
// definición de gallery.ts): arma un presupuesto de ejemplo en
// memoria, con datos de muestra por cada campo real ya agregado, para
// pasarlo a renderPresupuestoPdfHtml sin crear nada en la cuenta ni
// esperar a que el usuario cargue datos de verdad. Misma lógica de
// cálculo (fórmulas, valor en letras, Total General por sección) que
// buildPresupuestoData en presupuestos/actions.ts, reescrita acá
// porque la entrada es la estructura completa de la plantilla, no un
// FormData ya enviado.
export function buildTemplateEditorPreviewPresupuesto(
  template: Template,
  pages: PageWithSections[],
): Presupuesto {
  const allSections = pages.flatMap((p) => p.sections);
  const fillable = allSections
    .flatMap((s) => s.fields)
    .filter((sf): sf is typeof sf & { field_catalog_id: string } => sf.field_catalog_id !== null);

  const data: PresupuestoData = {};
  const items: PresupuestoItems = {};

  for (const section of allSections) {
    if (section.type === "tabla_items") items[section.id] = sampleItems();
  }
  for (const [sectionId, rows] of Object.entries(items)) {
    data[sectionTotalFieldId(sectionId)] = String(grandTotal(rows));
  }

  for (const sf of fillable) {
    if (sf.number_in_words_of || sf.formula !== null) continue;
    if (!sf.field) continue;
    data[sf.field_catalog_id] = sampleForField(sf.field.name, sf.field.data_type);
  }

  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const sf of fillable) {
      if (!sf.formula) continue;
      const result = evaluateFormula(sf.formula, data);
      const next = result === null ? "" : String(result);
      if (data[sf.field_catalog_id] !== next) {
        data[sf.field_catalog_id] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const sf of fillable) {
    if (!sf.number_in_words_of) continue;
    const source = data[sf.number_in_words_of];
    const amount = Number(Array.isArray(source) ? source[0] : source);
    if (!Number.isFinite(amount)) {
      data[sf.field_catalog_id] = "";
      continue;
    }
    const words = numberToWordsEs(amount, { exactosWhenWhole: sf.number_in_words_include_amount });
    data[sf.field_catalog_id] = sf.number_in_words_include_amount ? `${words} (${formatMoney(amount)})` : words;
  }

  return {
    id: randomUUID(),
    account_id: SAMPLE_ACCOUNT_ID,
    template_id: template.id,
    client_id: null,
    client_name: "Cliente de Ejemplo",
    client_email: "cliente@ejemplo.com",
    client_phone: "0414-1234567",
    client_address: "Av. Principal, Caracas",
    status: "borrador",
    data,
    items,
    total_amount: null,
    number: 1,
    pdf_path: null,
    sent_at: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  };
}
