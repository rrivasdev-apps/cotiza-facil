import { randomUUID } from "crypto";
import { GALLERY_TEMPLATES } from "./gallery";
import {
  DEFAULT_FIELD_STYLE,
  DEFAULT_HEADER_FOOTER,
  DEFAULT_THEME,
  withFieldStyleDefaults,
} from "@/lib/types";
import type {
  DataType,
  FieldCatalogEntry,
  PageWithSections,
  Presupuesto,
  PresupuestoData,
  PresupuestoItem,
  PresupuestoItems,
  SectionWithFields,
  Template,
  TemplateSectionField,
} from "@/lib/types";
import { evaluateFormula } from "@/lib/formula";
import { numberToWordsEs } from "@/lib/number-to-words";
import { grandTotal, sectionTotalFieldId } from "@/lib/presupuesto-items";

const SAMPLE_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";

// Ejemplos a mano por nombre de campo — mismos nombres que usa
// gallery.ts, así que cualquier plantilla que use un campo ya conocido
// (p.ej. "Proyecto") muestra un dato creíble en vez de un genérico
// "Ejemplo". Lo que no está acá cae al fallback por data_type.
const SAMPLE_BY_FIELD_NAME: Record<string, string | string[]> = {
  "Alcance": "Diagnóstico inicial, propuesta de mejoras y acompañamiento en la implementación durante 3 meses.",
  "Concepto": "Servicio profesional",
  "Duración": "3 horas",
  "Duración Estimada": "3 meses",
  "Entorno": "Producción",
  "Estilo": "Moderno y minimalista",
  "Incluye": ["Diseño", "Materiales", "Instalación"],
  "Locación": "Salón Jardín Real",
  "Materiales Principales": "Madera de roble, herrajes de acero inoxidable",
  "Modalidad de Pago": "40% anticipo, 30% avance de obra, 30% entrega",
  "Monto Recibido": "850",
  "Método de Pago": "Transferencia bancaria",
  "Nivel de Soporte": "Prioritario 24/7",
  "Norma Aplicable": "COVENIN 1756",
  "Nuestro Enfoque": "Trabajamos de la mano contigo en cada etapa, con revisiones constantes y comunicación clara.",
  "Plazo de Ejecución": "45 días hábiles",
  "Proyecto": "Remodelación de Oficinas Centrales",
  "Responsable Técnico": "Ing. Carlos Pérez",
  "Resultados Esperados": "Un espacio renovado, funcional y alineado con la identidad de tu marca.",
  "Servicio Contratado": "Consultoría en Procesos Administrativos",
  "Sistema": "Sistema de gestión interna",
  "Tipo de Evento": "Cumpleaños de 15 Años",
  "Ubicación": "Zona Industrial, Nave 4",
  "Versión": "2.1.0",
  "Visión del Proyecto": "Crear una experiencia de marca memorable, coherente en cada punto de contacto con el cliente.",
};

// Campos de fecha conocidos, con cuántos días sumarle a hoy — el resto
// de los campos "fecha" (sin entrada acá) usan la fecha de hoy.
const DATE_FIELD_OFFSET_DAYS: Record<string, number> = {
  "Fecha del Evento": 30,
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sampleForField(name: string, dataType: DataType): string | string[] {
  if (dataType === "fecha") {
    const d = new Date();
    d.setDate(d.getDate() + (DATE_FIELD_OFFSET_DAYS[name] ?? 0));
    return isoDate(d);
  }
  const named = SAMPLE_BY_FIELD_NAME[name];
  if (named !== undefined) return named;
  switch (dataType) {
    case "texto_largo":
      return "Texto de ejemplo para este campo.";
    case "moneda":
      return "1000";
    case "lista":
      return ["Ítem de ejemplo 1", "Ítem de ejemplo 2"];
    case "texto_corto":
    default:
      return "Ejemplo";
  }
}

function sampleItems(): PresupuestoItem[] {
  return [
    { concepto: "Servicio o producto de ejemplo", cantidad: "1", precioUnitario: "1500" },
    { concepto: "Segundo ítem de ejemplo", cantidad: "2", precioUnitario: "250" },
  ];
}

// Arma, enteramente en memoria (sin tocar la base de datos), el mismo
// tipo de datos que lee la página real de un presupuesto — Template +
// PageWithSections[] + FieldCatalogEntry[] + Presupuesto — a partir de
// una plantilla de galería, para poder pasarlo tal cual a
// renderPresupuestoPdfHtml y generar un PDF de ejemplo sin crear nada
// en la cuenta de nadie. Recorre gallery.ts con la misma lógica que
// createTemplateFromGallery (mismos placeholders {{FIELD:..}} /
// {{SECTION_TOTAL:..}}), pero generando ids con randomUUID() en vez de
// insertar filas reales, y rellenando cada campo con un dato de
// muestra en vez de esperar que lo cargue un usuario.
export function buildGalleryPreviewDocument(key: string): {
  template: Template;
  pages: PageWithSections[];
  catalogFields: FieldCatalogEntry[];
  presupuesto: Presupuesto;
} {
  const def = GALLERY_TEMPLATES.find((t) => t.key === key);
  if (!def) throw new Error("Plantilla de galería no encontrada.");

  const templateId = randomUUID();
  const catalogFields: FieldCatalogEntry[] = [];
  const fieldIdByName = new Map<string, string>();
  const sectionIdByGlobalIndex: string[] = [];
  let totalFieldId: string | null = null;
  let globalSectionIndex = 0;

  const data: PresupuestoData = {};
  const items: PresupuestoItems = {};
  const pendingFormulas: { fieldId: string; formula: string }[] = [];
  const pendingNumberInWords: { fieldId: string; sourceFieldId: string }[] = [];

  function resolveFormula(formula: string | null | undefined): string | null {
    if (!formula) return null;
    return formula
      .replace(/\{\{FIELD:([^{}]+)\}\}/g, (_m, name: string) => {
        const id = fieldIdByName.get(name);
        if (!id) throw new Error(`Fórmula de galería referencia un campo inexistente: ${name}`);
        return `{{id:${id}}}`;
      })
      .replace(/\{\{SECTION_TOTAL:(\d+)\}\}/g, (_m, idx: string) => {
        const sectionId = sectionIdByGlobalIndex[Number(idx)];
        if (!sectionId) throw new Error(`Fórmula de galería referencia una sección inexistente: ${idx}`);
        return `{{id:${sectionTotalFieldId(sectionId)}}}`;
      });
  }

  const pages: PageWithSections[] = def.pages.map((pageDef, pageIndex) => {
    const pageId = randomUUID();

    const sections: SectionWithFields[] = pageDef.sections.map((sectionDef, sectionIndex) => {
      const sectionId = randomUUID();
      sectionIdByGlobalIndex[globalSectionIndex] = sectionId;
      globalSectionIndex++;

      if (sectionDef.isTotalField) totalFieldId = sectionTotalFieldId(sectionId);
      if (sectionDef.type === "tabla_items") {
        items[sectionId] = sampleItems();
      }

      const fields = sectionDef.fields.map((fieldDef, fieldIndex) => {
        if (fieldDef.kind === "field") {
          let fieldCatalogId = fieldIdByName.get(fieldDef.name);
          let catalogEntry: FieldCatalogEntry;
          if (fieldCatalogId) {
            catalogEntry = catalogFields.find((f) => f.id === fieldCatalogId)!;
          } else {
            fieldCatalogId = randomUUID();
            catalogEntry = {
              id: fieldCatalogId,
              account_id: SAMPLE_ACCOUNT_ID,
              name: fieldDef.name,
              data_type: fieldDef.data_type,
              use_saved_values: false,
              help_text: null,
              created_at: new Date().toISOString(),
            };
            catalogFields.push(catalogEntry);
            fieldIdByName.set(fieldDef.name, fieldCatalogId);
          }

          if (def.totalFieldName === fieldDef.name) totalFieldId = fieldCatalogId;

          const resolvedFormula = resolveFormula(fieldDef.formula);
          const numberInWordsOfId = fieldDef.numberInWordsOfName
            ? (fieldIdByName.get(fieldDef.numberInWordsOfName) ?? null)
            : null;
          if (fieldDef.numberInWordsOfName && !numberInWordsOfId) {
            throw new Error(`"Valor en letras" de galería referencia un campo inexistente: ${fieldDef.numberInWordsOfName}`);
          }

          if (resolvedFormula) {
            pendingFormulas.push({ fieldId: fieldCatalogId, formula: resolvedFormula });
          } else if (numberInWordsOfId) {
            pendingNumberInWords.push({ fieldId: fieldCatalogId, sourceFieldId: numberInWordsOfId });
          } else {
            data[fieldCatalogId] = sampleForField(fieldDef.name, fieldDef.data_type);
          }

          const sfRow: TemplateSectionField = {
            id: randomUUID(),
            account_id: SAMPLE_ACCOUNT_ID,
            section_id: sectionId,
            field_catalog_id: fieldCatalogId,
            order_index: fieldIndex,
            required: fieldDef.required,
            label_style: DEFAULT_FIELD_STYLE,
            value_style: { ...DEFAULT_FIELD_STYLE, ...(fieldDef.value_style ?? {}) },
            number_in_words_of: numberInWordsOfId,
            number_in_words_include_amount: false,
            visible: true,
            composite_template: null,
            formula: resolvedFormula,
          };
          return { ...withFieldStyleDefaults(sfRow), field: catalogEntry };
        }

        const sfRow: TemplateSectionField = {
          id: randomUUID(),
          account_id: SAMPLE_ACCOUNT_ID,
          section_id: sectionId,
          field_catalog_id: null,
          order_index: fieldIndex,
          required: fieldDef.required,
          label_style: DEFAULT_FIELD_STYLE,
          value_style: { ...DEFAULT_FIELD_STYLE, ...(fieldDef.value_style ?? {}) },
          number_in_words_of: null,
          number_in_words_include_amount: false,
          visible: true,
          composite_template: fieldDef.text,
          formula: null,
        };
        return { ...withFieldStyleDefaults(sfRow), field: null };
      });

      return {
        id: sectionId,
        account_id: SAMPLE_ACCOUNT_ID,
        template_id: templateId,
        page_id: pageId,
        type: sectionDef.type,
        title: sectionDef.title,
        order_index: sectionIndex,
        config: sectionDef.config,
        fields,
      };
    });

    return {
      id: pageId,
      account_id: SAMPLE_ACCOUNT_ID,
      template_id: templateId,
      order_index: pageIndex,
      title: pageDef.title,
      show_header: pageDef.show_header,
      show_footer: pageDef.show_footer,
      body_align_h: pageDef.body_align_h,
      body_align_v: pageDef.body_align_v,
      sections,
    };
  });

  // Semilla de los Totales Generales de cada tabla_items ANTES de
  // resolver fórmulas — mismo orden que buildSectionTotalsSeed +
  // buildPresupuestoData en presupuestos/actions.ts, para que una
  // fórmula "{{SECTION_TOTAL:n}}" encuentre el dato ya puesto.
  for (const [sectionId, rows] of Object.entries(items)) {
    data[sectionTotalFieldId(sectionId)] = String(grandTotal(rows));
  }

  // Hasta 5 pasadas para permitir que una fórmula referencie el
  // resultado de otra (Subtotal -> IVA -> Total), igual que al crear
  // un presupuesto real.
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const pf of pendingFormulas) {
      const result = evaluateFormula(pf.formula, data);
      const next = result === null ? "" : String(result);
      if (data[pf.fieldId] !== next) {
        data[pf.fieldId] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const pw of pendingNumberInWords) {
    const source = data[pw.sourceFieldId];
    const amount = Number(Array.isArray(source) ? source[0] : source);
    data[pw.fieldId] = Number.isFinite(amount) ? numberToWordsEs(amount, { exactosWhenWhole: true }) : "";
  }

  const template: Template = {
    id: templateId,
    account_id: SAMPLE_ACCOUNT_ID,
    name: def.name,
    theme: { ...DEFAULT_THEME, ...def.theme },
    header: { ...DEFAULT_HEADER_FOOTER, ...def.header },
    footer: { ...DEFAULT_HEADER_FOOTER, ...def.footer },
    total_field_id: totalFieldId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const presupuesto: Presupuesto = {
    id: randomUUID(),
    account_id: SAMPLE_ACCOUNT_ID,
    template_id: templateId,
    client_name: "Cliente de Ejemplo",
    client_email: "cliente@ejemplo.com",
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

  return { template, pages, catalogFields, presupuesto };
}
