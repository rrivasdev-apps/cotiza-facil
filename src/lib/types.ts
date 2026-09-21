export type DataType = "texto_corto" | "texto_largo" | "fecha" | "moneda" | "lista";

export const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: "texto_corto", label: "Texto corto" },
  { value: "texto_largo", label: "Texto largo" },
  { value: "fecha", label: "Fecha" },
  { value: "moneda", label: "Moneda" },
  { value: "lista", label: "Lista" },
];

export type SectionType =
  | "portada"
  | "tabla_datos"
  | "texto_libre"
  | "lista_items"
  | "clausulas"
  | "cierre";

export const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "portada", label: "Portada" },
  { value: "tabla_datos", label: "Tabla de datos" },
  { value: "texto_libre", label: "Texto libre" },
  { value: "lista_items", label: "Lista de ítems" },
  { value: "clausulas", label: "Cláusulas" },
  { value: "cierre", label: "Cierre" },
];

export type ThemeFont = "manrope" | "inter" | "jetbrains-mono";

export const THEME_FONTS: { value: ThemeFont; label: string }[] = [
  { value: "manrope", label: "Manrope" },
  { value: "inter", label: "Inter" },
  { value: "jetbrains-mono", label: "JetBrains Mono" },
];

export type GradientDirection = "vertical" | "horizontal" | "diagonal-left" | "diagonal-right";

export const GRADIENT_DIRECTIONS: { value: GradientDirection; label: string }[] = [
  { value: "vertical", label: "Vertical" },
  { value: "horizontal", label: "Horizontal" },
  { value: "diagonal-left", label: "Diagonal (izquierda a derecha)" },
  { value: "diagonal-right", label: "Diagonal (derecha a izquierda)" },
];

// Ángulo CSS de linear-gradient() para cada dirección — 90deg = hacia
// la derecha, 180deg = hacia abajo (convención CSS, no matemática).
export const GRADIENT_ANGLES: Record<GradientDirection, number> = {
  vertical: 180,
  horizontal: 90,
  "diagonal-left": 135,
  "diagonal-right": 225,
};

export type AlignH = "left" | "center" | "right";
export type AlignV = "top" | "center" | "bottom";

export const ALIGN_H_OPTIONS: { value: AlignH; label: string }[] = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Derecha" },
];

export const ALIGN_V_OPTIONS: { value: AlignV; label: string }[] = [
  { value: "top", label: "Arriba" },
  { value: "center", label: "Medio" },
  { value: "bottom", label: "Abajo" },
];

// Encabezado/pie: contenido intencionalmente limitado (no son
// "secciones" completas) — logo de la plantilla, número de página
// calculado al renderizar, o texto libre corto.
export type HeaderFooterElement =
  | { type: "logo" }
  | { type: "page_number" }
  | { type: "texto"; text: string };

export const HEADER_FOOTER_ELEMENT_TYPES: { value: HeaderFooterElement["type"]; label: string }[] = [
  { value: "logo", label: "Logo" },
  { value: "page_number", label: "Número de página" },
  { value: "texto", label: "Texto" },
];

export type HeaderFooterConfig = {
  alignH: AlignH;
  alignV: AlignV;
  elements: HeaderFooterElement[];
};

export const DEFAULT_HEADER_FOOTER: HeaderFooterConfig = {
  alignH: "left",
  alignV: "top",
  elements: [],
};

export type TemplateTheme = {
  accent: string;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  // Punto (0-100) donde termina el color "inicio" sólido y arranca
  // la transición hacia "fin" — 0 es un degradado de punta a punta.
  gradientDirection: GradientDirection;
  gradientStop: number;
  font: ThemeFont;
  logoPath?: string | null;
};

export const DEFAULT_THEME: TemplateTheme = {
  accent: "#14a874",
  gradientFrom: null,
  gradientTo: null,
  gradientDirection: "diagonal-left",
  gradientStop: 0,
  font: "manrope",
  logoPath: null,
};

export type FieldCatalogEntry = {
  id: string;
  account_id: string;
  name: string;
  data_type: DataType;
  created_at: string;
};

export type Template = {
  id: string;
  account_id: string;
  name: string;
  theme: TemplateTheme;
  header: HeaderFooterConfig;
  footer: HeaderFooterConfig;
  created_at: string;
  updated_at: string;
};

export type TemplatePage = {
  id: string;
  account_id: string;
  template_id: string;
  order_index: number;
  title: string;
  show_header: boolean;
  show_footer: boolean;
  body_align_h: AlignH;
  body_align_v: AlignV;
};

export type TemplateSection = {
  id: string;
  account_id: string;
  template_id: string;
  page_id: string;
  type: SectionType;
  title: string;
  order_index: number;
  config: Record<string, unknown>;
};

// Estilo de texto de la etiqueta o el valor de un campo dentro de una
// sección. fontFamily/fontSize en null heredan el theme de la
// plantilla (o el tamaño por defecto del tipo de sección); bold/
// italic/underline son overrides explícitos, false = no aplica.
export type FieldStyle = {
  fontFamily: ThemeFont | null;
  fontSize: number | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

export const DEFAULT_FIELD_STYLE: FieldStyle = {
  fontFamily: null,
  fontSize: null,
  bold: false,
  italic: false,
  underline: false,
};

export type TemplateSectionField = {
  id: string;
  account_id: string;
  section_id: string;
  // null solo en una "línea combinada" (ver composite_template) — toda
  // fila normal de un campo lo tiene seteado.
  field_catalog_id: string | null;
  order_index: number;
  required: boolean;
  label_style: FieldStyle;
  value_style: FieldStyle;
  // field_catalog_id de un campo tipo "moneda" de la misma plantilla
  // — cuando está seteado, este campo (debe ser de texto) no se pide
  // al usuario: se calcula solo como el monto de ese campo escrito en
  // letras al guardar el presupuesto.
  number_in_words_of: string | null;
  // Si es false, el campo se sigue pidiendo al cargar el presupuesto
  // pero no se imprime en el documento — para campos que solo sirven
  // de base de cálculo (ej. el "moneda" detrás de un "valor en letras").
  visible: boolean;
  // Texto libre con campos intercalados, ej: "Son: {{id:<uuid>}}
  // (Bs. {{id:<uuid>}})" — solo en una "línea combinada"
  // (field_catalog_id null). Ver src/lib/composite-template.ts.
  composite_template: string | null;
  // Fórmula aritmética con campos moneda intercalados, ej:
  // "{{id:<uuid-precio>}} * {{id:<uuid-cantidad>}}" — cuando está
  // seteada, este campo (debe ser moneda) tampoco se pide al usuario:
  // se calcula solo al guardar el presupuesto. Ver src/lib/formula.ts.
  formula: string | null;
};

// La fila cruda de Supabase trae label_style/value_style como jsonb
// parcial (puede ser {}). Se completa acá, igual que theme/header/
// footer se completan con sus defaults al leer una plantilla.
export function withFieldStyleDefaults<T extends { label_style?: Partial<FieldStyle> | null; value_style?: Partial<FieldStyle> | null }>(
  sf: T,
): T & { label_style: FieldStyle; value_style: FieldStyle } {
  return {
    ...sf,
    label_style: { ...DEFAULT_FIELD_STYLE, ...(sf.label_style ?? {}) },
    value_style: { ...DEFAULT_FIELD_STYLE, ...(sf.value_style ?? {}) },
  };
}

// field es null para una "línea combinada" (composite_template seteado,
// field_catalog_id null) — no representa un campo del catálogo.
export type SectionWithFields = TemplateSection & {
  fields: (TemplateSectionField & { field: FieldCatalogEntry | null })[];
};

export type PageWithSections = TemplatePage & {
  sections: SectionWithFields[];
};

export type TemplateWithPages = Template & {
  pages: PageWithSections[];
};

export type PresupuestoStatus = "borrador" | "enviado" | "aprobado";

export const PRESUPUESTO_STATUS_LABELS: Record<PresupuestoStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aprobado: "Aprobado",
};

// Valor guardado por campo, indexado por field_catalog_id. Una lista
// se guarda como array de líneas; el resto, como texto plano.
export type PresupuestoData = Record<string, string | string[]>;

export type Presupuesto = {
  id: string;
  account_id: string;
  template_id: string;
  client_name: string;
  client_email: string;
  status: PresupuestoStatus;
  data: PresupuestoData;
  pdf_path: string | null;
  sent_at: string | null;
  approved_at: string | null;
  created_at: string;
};
