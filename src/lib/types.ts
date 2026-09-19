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
  created_at: string;
  updated_at: string;
};

export type TemplateSection = {
  id: string;
  account_id: string;
  template_id: string;
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

export type TemplateWithSections = Template & {
  sections: SectionWithFields[];
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
