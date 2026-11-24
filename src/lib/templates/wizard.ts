import {
  DEFAULT_FIELD_STYLE,
  type FieldStyle,
  type HeaderFooterConfig,
  type HeaderFooterElement,
  type HeaderFooterZoneKey,
  type PageWithSections,
  type SectionWithFields,
  type Template,
  type TemplateSectionField,
} from "@/lib/types";

// Lógica pura del asistente de configuración inicial — sin base de datos,
// para que la usen tanto la vista previa en vivo (cliente) como las
// acciones que guardan (servidor) y las dos hagan exactamente lo mismo.
//
// El modelo de plantillas no tiene "casillas" para dirección, firma o
// condiciones: son texto del pie, una sección "cierre" y una sección
// "clausulas". El asistente se apoya en esas mismas piezas (no inventa
// columnas nuevas), así lo que configura aquí se sigue pudiendo editar
// en Estructura y Tema.

export const SIGNATURE_SECTION_TITLE = "Firma";
export const CONDITIONS_SECTION_TITLE = "Condiciones";
export const SIGNATURE_LINE = "______________________________";
const WIZARD_PREVIEW_SECTION_ID = "wizard-preview-firma";

export type WizardCondition = {
  // null = condición nueva que todavía no existe en la base.
  id: string | null;
  text: string;
  on: boolean;
};

export type WizardDraft = {
  // null = conservar el fondo que trae la plantilla.
  bgColor: string | null;
  address: string;
  email: string;
  signer: string;
  role: string;
  conditions: WizardCondition[];
};

// Fondos que ofrece el asistente, con el color de texto que mantiene
// legible. Son pocos a propósito: elegir entre 6 círculos es fácil,
// un selector de color libre no.
export const BACKGROUND_CHOICES: { label: string; bg: string }[] = [
  { label: "Blanco", bg: "#ffffff" },
  { label: "Crema", bg: "#fbf2e6" },
  { label: "Gris claro", bg: "#f1f1ef" },
  { label: "Azul claro", bg: "#eaf2ff" },
  { label: "Gris oscuro", bg: "#2b2c2e" },
  { label: "Negro", bg: "#050505" },
];

// Luminancia relativa (WCAG) → texto oscuro sobre fondo claro y al
// revés. Sin esto, elegir "Blanco" en una plantilla de texto blanco
// dejaba el presupuesto ilegible.
export function pickTextColor(bgColor: string): string {
  const hex = bgColor.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const channel = (offset: number) => {
    const value = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.4 ? "#23241f" : "#ffffff";
}

export function hasLogoElement(config: HeaderFooterConfig): boolean {
  return (["left", "center", "right"] as const).some((zone) => config[zone].elements.some((el) => el.type === "logo"));
}

// Subir un logo solo lo guarda en el tema: se dibuja únicamente donde
// haya un elemento "logo" en el encabezado o el pie. Las plantillas de
// galería no lo traen, así que sin esto el logo subido no se vería.
export function withLogoInHeader(header: HeaderFooterConfig, footer: HeaderFooterConfig): HeaderFooterConfig {
  if (hasLogoElement(header) || hasLogoElement(footer)) return header;
  return {
    ...header,
    left: { ...header.left, elements: [{ type: "logo" }, ...header.left.elements] },
  };
}

function firstTextIndex(elements: HeaderFooterElement[]): number {
  return elements.findIndex((el) => el.type === "texto");
}

export function readZoneText(config: HeaderFooterConfig, zone: HeaderFooterZoneKey): string {
  const element = config[zone].elements.find((el) => el.type === "texto");
  return element && element.type === "texto" ? element.text : "";
}

// Textos de ejemplo que traen las plantillas de galería ("Tu Nombre",
// "correodeempresa@gmail.com"...). El asistente no los muestra como si
// fueran datos de la persona: el campo aparece vacío hasta que escriba.
const PLACEHOLDER_PATTERN = /tu nombre|nombre apellido|nombreapellido|de empresa|de tu empresa|tucorreo@|@empresa\.com|correodeempresa|dulce|ejemplo/i;

export function isPlaceholderText(text: string): boolean {
  return !text.trim() || PLACEHOLDER_PATTERN.test(text);
}

// En las plantillas de galería el correo unas veces va a la izquierda
// del pie y otras al centro. El correo va donde ya haya un "@"; la
// dirección, en la otra zona. Sin ningún "@", correo a la izquierda.
export function contactZones(footer: HeaderFooterConfig): { email: HeaderFooterZoneKey; address: HeaderFooterZoneKey } {
  const hasEmail = (zone: HeaderFooterZoneKey) => readZoneText(footer, zone).includes("@");
  if (hasEmail("center") && !hasEmail("left")) return { email: "center", address: "left" };
  return { email: "left", address: "center" };
}

// Reemplaza el primer texto de la zona (o lo agrega al principio, antes
// de un número de página, por ejemplo). Texto vacío no toca nada: quien
// salta el paso conserva lo que trae la plantilla, y el resumen final
// lo marca como pendiente.
export function withZoneText(config: HeaderFooterConfig, zone: HeaderFooterZoneKey, text: string): HeaderFooterConfig {
  const trimmed = text.trim();
  if (!trimmed) return config;
  const elements = [...config[zone].elements];
  const index = firstTextIndex(elements);
  if (index >= 0) {
    elements[index] = { type: "texto", text: trimmed };
  } else {
    elements.unshift({ type: "texto", text: trimmed });
  }
  return { ...config, [zone]: { ...config[zone], elements } };
}

// Un texto de "línea combinada" interpreta {{...}} como campos; lo que
// escribe una persona nunca debe abrir esa puerta.
export function sanitizeLineText(text: string): string {
  return text.replace(/\{\{|\}\}/g, "").trim();
}

// Varias plantillas de galería ya traen una sección "Firma" (de texto
// libre, con "Tu Nombre"). Se reutiliza esa, de cualquier tipo, en vez
// de agregar una segunda.
export function findSignatureSection(pages: PageWithSections[]): SectionWithFields | null {
  for (const page of pages) {
    const found = page.sections.find((s) => s.title.trim().toLowerCase() === SIGNATURE_SECTION_TITLE.toLowerCase());
    if (found) return found;
  }
  return null;
}

// Líneas de texto de la firma (nombre, cargo), sin la raya de firmar
// que agrega el propio asistente.
export function signatureTextLines(section: SectionWithFields | null): SectionWithFields["fields"] {
  return compositeLines(section).filter((sf) => sf.composite_template !== SIGNATURE_LINE);
}

// Primera sección de cláusulas de la plantilla — ahí viven las
// condiciones.
export function findConditionsSection(pages: PageWithSections[]): SectionWithFields | null {
  for (const page of pages) {
    const found = page.sections.find((s) => s.type === "clausulas");
    if (found) return found;
  }
  return null;
}

function compositeLines(section: SectionWithFields | null): SectionWithFields["fields"] {
  if (!section) return [];
  return section.fields.filter((sf) => sf.field_catalog_id === null && sf.composite_template !== null);
}

export function readWizardDraft(template: Template, pages: PageWithSections[]): WizardDraft {
  const signatureLines = signatureTextLines(findSignatureSection(pages)).map((sf) => sf.composite_template ?? "");
  const zones = contactZones(template.footer);
  const real = (text: string) => (isPlaceholderText(text) ? "" : text);

  return {
    bgColor: null,
    address: real(readZoneText(template.footer, zones.address)),
    email: real(readZoneText(template.footer, zones.email)),
    signer: real(signatureLines[0] ?? ""),
    role: real(signatureLines[1] ?? ""),
    conditions: compositeLines(findConditionsSection(pages)).map((sf) => ({
      id: sf.id,
      text: sf.composite_template ?? "",
      on: sf.visible,
    })),
  };
}

function previewLine(id: string, text: string, order: number, style: FieldStyle, visible = true): TemplateSectionField & { field: null } {
  return {
    id,
    account_id: "",
    section_id: WIZARD_PREVIEW_SECTION_ID,
    field_catalog_id: null,
    order_index: order,
    required: false,
    label_style: DEFAULT_FIELD_STYLE,
    value_style: style,
    number_in_words_of: null,
    number_in_words_include_amount: false,
    visible,
    composite_template: text,
    formula: null,
    field: null,
  } as TemplateSectionField & { field: null };
}

export const SIGNER_NAME_STYLE: FieldStyle = { ...DEFAULT_FIELD_STYLE, bold: true };
export const SIGNER_ROLE_STYLE: FieldStyle = { ...DEFAULT_FIELD_STYLE, fontSize: 14 };

// Lo que ve la vista previa mientras la persona escribe, sin guardar
// nada: el mismo resultado que dejarían las acciones de guardado.
export function applyWizardDraft(
  template: Template,
  pages: PageWithSections[],
  draft: WizardDraft,
): { template: Template; pages: PageWithSections[] } {
  const zones = contactZones(template.footer);
  let footer = withZoneText(template.footer, zones.address, draft.address);
  footer = withZoneText(footer, zones.email, draft.email);
  const header = withLogoInHeader(template.header, footer);

  const theme = { ...template.theme };
  if (draft.bgColor) {
    theme.bgColor = draft.bgColor;
    theme.textColor = pickTextColor(draft.bgColor);
    theme.gradientFrom = null;
    theme.gradientTo = null;
  }

  const conditionsSection = findConditionsSection(pages);
  const signatureSection = findSignatureSection(pages);
  const signer = sanitizeLineText(draft.signer);
  const role = sanitizeLineText(draft.role);

  const nextPages = pages.map((page, pageIndex) => {
    let sections = page.sections.map((section) => {
      // Fondo elegido por el asistente: los colores propios de una
      // página mandan sobre el tema, así que el preview también los ignora.
      if (section.id === conditionsSection?.id) {
        const others = section.fields.filter((sf) => !(sf.field_catalog_id === null && sf.composite_template !== null));
        const lines = draft.conditions.map((c, index) => {
          // Una condición recién guardada puede tener id antes de que la
          // página recargue sus datos; en ese rato se dibuja como nueva.
          const existing = c.id ? section.fields.find((sf) => sf.id === c.id) : undefined;
          return existing
            ? { ...existing, composite_template: c.text, visible: c.on }
            : previewLine(`wizard-new-${index}`, c.text, 1000 + index, DEFAULT_FIELD_STYLE, c.on);
        });
        return { ...section, fields: [...others, ...lines.filter((l) => l.composite_template?.trim())] };
      }
      if (section.id === signatureSection?.id) {
        return { ...section, fields: applySignaturePreview(section, signer, role) };
      }
      return section;
    });

    const isLastPage = pageIndex === pages.length - 1;
    if (isLastPage && !signatureSection && signer) {
      sections = [
        ...sections,
        {
          id: WIZARD_PREVIEW_SECTION_ID,
          account_id: "",
          template_id: template.id,
          page_id: page.id,
          type: "cierre",
          title: SIGNATURE_SECTION_TITLE,
          order_index: sections.length,
          config: {},
          fields: buildSignaturePreviewFields(WIZARD_PREVIEW_SECTION_ID, signer, role),
        },
      ];
    }

    return {
      ...page,
      bg_color: draft.bgColor ? null : page.bg_color,
      text_color: draft.bgColor ? null : page.text_color,
      // Todas las plantillas de galería traen imagen de fondo; un color
      // liso no se vería debajo de ella.
      show_background_image: draft.bgColor ? false : page.show_background_image,
      sections,
    };
  });

  return { template: { ...template, header, footer, theme }, pages: nextPages };
}

function buildSignaturePreviewFields(sectionId: string, signer: string, role: string): SectionWithFields["fields"] {
  if (!signer) return [];
  const lines = [previewLine(`${sectionId}-line`, SIGNATURE_LINE, 0, DEFAULT_FIELD_STYLE), previewLine(`${sectionId}-name`, signer, 1, SIGNER_NAME_STYLE)];
  if (role) lines.push(previewLine(`${sectionId}-role`, role, 2, SIGNER_ROLE_STYLE));
  return lines;
}

// Firma ya existente: se cambia el texto de sus líneas conservando el
// estilo que trae la plantilla; el cargo se agrega solo si no había
// segunda línea. Nombre vacío deja todo como está.
function applySignaturePreview(section: SectionWithFields, signer: string, role: string): SectionWithFields["fields"] {
  if (!signer) return section.fields;
  const textLines = signatureTextLines(section);
  const [nameLine, roleLine] = textLines;
  const fields = section.fields.map((sf) => {
    if (sf.id === nameLine?.id) return { ...sf, composite_template: signer };
    if (roleLine && sf.id === roleLine.id && role) return { ...sf, composite_template: role };
    return sf;
  });
  if (role && !roleLine) {
    const base = nameLine?.value_style ?? SIGNER_ROLE_STYLE;
    fields.push(previewLine(`${section.id}-role`, role, 999, { ...base, bold: false, fontSize: 14 }));
  }
  return fields;
}
