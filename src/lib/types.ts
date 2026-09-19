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
  font: ThemeFont;
  logoPath?: string | null;
};

export const DEFAULT_THEME: TemplateTheme = {
  accent: "#14a874",
  gradientFrom: null,
  gradientTo: null,
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

export type TemplateSectionField = {
  id: string;
  account_id: string;
  section_id: string;
  field_catalog_id: string;
  order_index: number;
  required: boolean;
};

export type SectionWithFields = TemplateSection & {
  fields: (TemplateSectionField & { field: FieldCatalogEntry })[];
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
