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
  | "cierre"
  | "tabla_items"
  | "datos_cliente"
  | "dos_columnas"
  | "titulo";

export const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "portada", label: "Portada" },
  { value: "tabla_datos", label: "Tabla de datos" },
  { value: "texto_libre", label: "Texto libre" },
  { value: "lista_items", label: "Lista de ítems" },
  { value: "clausulas", label: "Cláusulas" },
  { value: "cierre", label: "Cierre" },
  { value: "tabla_items", label: "Ítems (cant. × precio)" },
  { value: "datos_cliente", label: "Datos del cliente (fecha, N° presupuesto)" },
  { value: "dos_columnas", label: "Dos columnas (etiqueta + campos)" },
  { value: "titulo", label: "Título (texto grande, negrita/outline)" },
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

export type SocialNetwork = "instagram" | "whatsapp" | "facebook" | "tiktok" | "linkedin";

// Encabezado/pie: contenido intencionalmente limitado (no son
// "secciones" completas) — logo de la plantilla, número de página
// calculado al renderizar, texto libre corto, o una red social (el
// usuario solo escribe su usuario/número, el link completo se arma
// solo — ver buildSocialUrl en social-icons.ts).
export type HeaderFooterElement =
  | { type: "logo" }
  | { type: "page_number" }
  | { type: "texto"; text: string }
  | { type: "social"; network: SocialNetwork; handle: string };

export const HEADER_FOOTER_ELEMENT_TYPES: { value: HeaderFooterElement["type"]; label: string }[] = [
  { value: "logo", label: "Logo" },
  { value: "page_number", label: "Número de página" },
  { value: "texto", label: "Texto" },
  { value: "social", label: "Red social" },
];

// El encabezado/pie es una franja con tres contenedores (izquierda,
// centro, derecha) — cada uno agrupa sus propios elementos y elige si
// se apilan (uno debajo del otro) o van en fila (uno al lado del otro).
export type HeaderFooterZoneKey = "left" | "center" | "right";
export type ZoneDirection = "column" | "row";

export const HEADER_FOOTER_ZONES: { value: HeaderFooterZoneKey; label: string }[] = [
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Derecha" },
];

export const ZONE_DIRECTION_OPTIONS: { value: ZoneDirection; label: string }[] = [
  { value: "column", label: "Apilado (uno debajo del otro)" },
  { value: "row", label: "En fila (uno al lado del otro)" },
];

export type HeaderFooterZone = {
  direction: ZoneDirection;
  elements: HeaderFooterElement[];
};

export type HeaderFooterConfig = {
  alignV: AlignV;
  left: HeaderFooterZone;
  center: HeaderFooterZone;
  right: HeaderFooterZone;
};

export const DEFAULT_HEADER_FOOTER_ZONE: HeaderFooterZone = { direction: "column", elements: [] };

export const DEFAULT_HEADER_FOOTER: HeaderFooterConfig = {
  alignV: "top",
  left: { direction: "column", elements: [] },
  center: { direction: "column", elements: [] },
  right: { direction: "column", elements: [] },
};

// Compatibilidad hacia atrás: plantillas creadas antes de las tres
// franjas guardaban { alignH, alignV, elements } como una sola lista.
// Esos elementos pasan tal cual a la franja que coincide con su
// alignH de entonces, apilados (antes iban todos en una sola fila, pero
// como la franja migrada normalmente tiene un solo elemento — logo o
// texto — el resultado visual no cambia; si tenía más de uno, pasan a
// apilarse, que es el comportamiento por defecto de una franja nueva).
type LegacyHeaderFooterConfig = {
  alignH?: AlignH;
  alignV?: AlignV;
  elements?: HeaderFooterElement[];
};

export function normalizeHeaderFooter(raw: unknown): HeaderFooterConfig {
  const value = (raw ?? {}) as LegacyHeaderFooterConfig & Partial<HeaderFooterConfig>;
  if (value.left || value.center || value.right) {
    return {
      alignV: value.alignV ?? DEFAULT_HEADER_FOOTER.alignV,
      left: { ...DEFAULT_HEADER_FOOTER_ZONE, ...value.left },
      center: { ...DEFAULT_HEADER_FOOTER_ZONE, ...value.center },
      right: { ...DEFAULT_HEADER_FOOTER_ZONE, ...value.right },
    };
  }
  if (value.elements && value.elements.length > 0) {
    const zone: HeaderFooterZoneKey = value.alignH === "right" ? "right" : value.alignH === "center" ? "center" : "left";
    return {
      ...DEFAULT_HEADER_FOOTER,
      alignV: value.alignV ?? DEFAULT_HEADER_FOOTER.alignV,
      [zone]: { direction: "column", elements: value.elements },
    };
  }
  return DEFAULT_HEADER_FOOTER;
}

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
  // Con degradado, invierte inicio/fin en las páginas pares (2ª, 4ª...)
  // — mismo criterio que un impreso a dos caras, donde el degradado de
  // cada hoja "espeja" al de la hoja siguiente. Sin degradado no tiene
  // efecto (no hay dos colores para alternar).
  alternatePageTheme: boolean;
};

export const DEFAULT_THEME: TemplateTheme = {
  accent: "#14a874",
  gradientFrom: null,
  gradientTo: null,
  gradientDirection: "diagonal-left",
  gradientStop: 0,
  font: "manrope",
  logoPath: null,
  alternatePageTheme: true,
};

export type FieldCatalogEntry = {
  id: string;
  account_id: string;
  name: string;
  data_type: DataType;
  use_saved_values: boolean;
  help_text: string | null;
  created_at: string;
};

export type FieldSavedValue = {
  id: string;
  account_id: string;
  field_catalog_id: string;
  value: string;
  created_at: string;
};

// A diferencia de FieldSavedValue, no cuelga de ningún campo del
// catálogo — "Concepto" es una columna fija de cualquier sección
// tabla_items, la misma en todas las plantillas. Ver
// item_concept_values en supabase/migrations.
export type ItemConceptValue = {
  id: string;
  account_id: string;
  value: string;
  created_at: string;
};

export type Cliente = {
  id: string;
  account_id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export type Template = {
  id: string;
  account_id: string;
  name: string;
  theme: TemplateTheme;
  header: HeaderFooterConfig;
  footer: HeaderFooterConfig;
  // Cuál campo de esta plantilla es "el total" del presupuesto, para
  // reportes futuros (sumar/agrupar sin depender de la estructura de
  // cada plantilla) — un field_catalog_id real, o el id sintético
  // "section-total:<id>" de una tabla_items. Ver
  // src/lib/presupuesto-items.ts y total_amount en Presupuesto.
  total_field_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TemplateShareStatus = "pendiente" | "aceptada" | "rechazada";

// "Regalar" una plantilla a otra cuenta — ver
// src/lib/templates/share-actions.ts. source_template_name es un
// snapshot (sobrevive a que la plantilla original se borre después).
export type TemplateShare = {
  id: string;
  sender_account_id: string;
  sender_account_name: string;
  recipient_account_id: string;
  recipient_email: string;
  source_template_id: string | null;
  source_template_name: string;
  copied_template_id: string | null;
  status: TemplateShareStatus;
  created_at: string;
  resolved_at: string | null;
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

// Espacio extra alrededor de una sección puntual, en px — además del
// gap fijo que ya separa una sección de la siguiente. Vive en
// section.config (jsonb) en vez de una columna propia: es el único
// dato de layout por sección que existe hasta ahora, no amerita
// todavía una columna dedicada.
export type SectionMargins = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export const DEFAULT_SECTION_MARGINS: SectionMargins = { top: 0, bottom: 0, left: 0, right: 0 };

export function getSectionMargins(config: Record<string, unknown>): SectionMargins {
  const raw = config.margin as Partial<SectionMargins> | undefined;
  return { ...DEFAULT_SECTION_MARGINS, ...raw };
}

// Estilo del texto "PRESUPUESTO {cliente}" de una sección tipo
// "portada" — vive en section.config (mismo mecanismo que margin) en
// vez de una columna propia, porque solo aplica a este tipo de
// sección. fontSize null = 28px (el tamaño de siempre).
export type MastheadStyle = {
  fontSize: number | null;
  bold: boolean;
  align: AlignH;
};

export const DEFAULT_MASTHEAD_STYLE: MastheadStyle = { fontSize: null, bold: false, align: "center" };

export function getMastheadStyle(config: Record<string, unknown>): MastheadStyle {
  const raw = config.masthead as Partial<MastheadStyle> | undefined;
  return { ...DEFAULT_MASTHEAD_STYLE, ...raw };
}

// Estilo de texto de la etiqueta o el valor de un campo dentro de una
// sección. fontFamily/fontSize en null heredan el theme de la
// plantilla (o el tamaño por defecto del tipo de sección); bold/
// italic/underline son overrides explícitos, false = no aplica.
// align hereda el alineado por defecto de la sección cuando es null
// (equivale al "left" de siempre en la mayoría de los tipos). outline
// es el mismo efecto "letras en contorno" que ya tenía hardcodeado el
// masthead de portada (relleno transparente + contorno blanco) —
// generalizado acá para poder usarlo en cualquier campo/línea
// combinada, como en una sección "titulo". outlineSplit es una
// variante: parte el texto en la primera "/" y solo la parte de antes
// lleva el contorno (la de después, incluida la "/", va sólida) — el
// look de un banner tipo "RIDER TÉCNICO / CATERING". Mutuamente
// excluyente con outline (el editor solo deja prender uno).
export type FieldStyle = {
  fontFamily: ThemeFont | null;
  fontSize: number | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  outline: boolean;
  outlineSplit: boolean;
  align: AlignH | null;
};

export const DEFAULT_FIELD_STYLE: FieldStyle = {
  fontFamily: null,
  fontSize: null,
  bold: false,
  italic: false,
  underline: false,
  outline: false,
  outlineSplit: false,
  align: null,
};

// Título opcional y styleable de una sección — usado por "datos_cliente"
// (que de por sí nunca imprime su título, show default false) y
// "tabla_datos" (que sí lo imprime siempre por defecto, ver el
// segundo parámetro de getSectionTitleConfig).
export type SectionTitleConfig = {
  show: boolean;
  fontFamily: ThemeFont | null;
  fontSize: number | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: AlignH;
};

export const DEFAULT_SECTION_TITLE: SectionTitleConfig = {
  show: false,
  fontFamily: null,
  fontSize: null,
  bold: false,
  italic: false,
  underline: false,
  align: "left",
};

export function getSectionTitleConfig(
  config: Record<string, unknown>,
  base: SectionTitleConfig = DEFAULT_SECTION_TITLE,
): SectionTitleConfig {
  const raw = config.title as Partial<SectionTitleConfig> | undefined;
  return { ...base, ...raw };
}

// Qué datos del cliente, además de Nombre/Fecha/N° Presupuesto (que
// siempre se imprimen), muestra una sección "datos_cliente" — todos
// apagados por defecto, igual que "show" en SectionTitleConfig, para
// no cambiar el aspecto de plantillas ya armadas antes de que esto
// existiera.
export type DatosClienteFields = {
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
};

export const DEFAULT_DATOS_CLIENTE_FIELDS: DatosClienteFields = {
  showEmail: false,
  showPhone: false,
  showAddress: false,
};

export function getDatosClienteFields(config: Record<string, unknown>): DatosClienteFields {
  const raw = config.datosCliente as Partial<DatosClienteFields> | undefined;
  return { ...DEFAULT_DATOS_CLIENTE_FIELDS, ...raw };
}

// "texto_libre"/"lista_items" imprimen su título como una etiqueta
// chica automáticamente — este flag lo saca, para usar la sección como
// bloque de texto libre puro sin una etiqueta duplicada encima.
export function getHideTitle(config: Record<string, unknown>): boolean {
  return Boolean(config.hideTitle);
}

// Ancho de la columna izquierda de una sección "dos_columnas", en %
// del ancho total (la derecha toma el resto). section.title es la
// etiqueta de la izquierda — a diferencia de datos_cliente, acá
// siempre se imprime, no hay flag de "mostrar/ocultar".
export type ColumnsConfig = { leftPercent: number };

export const DEFAULT_COLUMNS_CONFIG: ColumnsConfig = { leftPercent: 30 };

export function getColumnsConfig(config: Record<string, unknown>): ColumnsConfig {
  const raw = config.columns as Partial<ColumnsConfig> | undefined;
  return { ...DEFAULT_COLUMNS_CONFIG, ...raw };
}

// Líneas horizontales arriba/abajo del contenido de una sección
// "titulo" (look banner, ej. "RIDER TÉCNICO / CATERING"). Prendidas
// por default porque es el look que motivó agregar el tipo de
// sección — se apagan si no se quieren.
export type TituloConfig = { rules: boolean };

export const DEFAULT_TITULO_CONFIG: TituloConfig = { rules: true };

export function getTituloConfig(config: Record<string, unknown>): TituloConfig {
  const raw = config.titulo as Partial<TituloConfig> | undefined;
  return { ...DEFAULT_TITULO_CONFIG, ...raw };
}

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
  // Con number_in_words_of activo: además del monto en letras, agrega
  // el número entre paréntesis al final — ej. "SEISCIENTOS CINCUENTA
  // EXACTOS ($ 650,00)". Sin efecto si number_in_words_of es null.
  number_in_words_include_amount: boolean;
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

// Un renglón de una sección tipo "tabla_items" — cantidad/precio van
// como string (mismo criterio que el resto de los valores moneda en
// PresupuestoData) para no perder lo que el usuario tipeó si todavía
// no es un número válido.
export type PresupuestoItem = {
  concepto: string;
  cantidad: string;
  precioUnitario: string;
};

// Indexado por section_id — separado de `data` porque acá la cantidad
// de renglones la decide quien carga el presupuesto, no la plantilla.
export type PresupuestoItems = Record<string, PresupuestoItem[]>;

export type Presupuesto = {
  id: string;
  account_id: string;
  template_id: string;
  // client_name/client_email son la "foto" real que se imprimió —
  // client_id es una referencia al cliente (nullable, se desvincula
  // solo si el cliente se borra) para reusar datos, no la fuente de
  // verdad del documento ya enviado. Ver Cliente más abajo.
  client_id: string | null;
  client_name: string;
  client_email: string;
  // Mismo criterio de "foto" que client_name/client_email, pero
  // opcionales — un cliente puede no tener teléfono/dirección
  // cargados, y los presupuestos de antes de esta columna no tienen
  // de dónde sacarlos.
  client_phone: string | null;
  client_address: string | null;
  status: PresupuestoStatus;
  data: PresupuestoData;
  items: PresupuestoItems;
  // Valor resuelto de template.total_field_id para este presupuesto
  // puntual, ej: para reportes futuros — null si la plantilla no
  // declaró un campo total, o si ese campo todavía no tiene valor.
  total_amount: number | null;
  // N° de presupuesto autogenerado y consecutivo (por cuenta) — se
  // asigna una sola vez al crearlo (ver claim_next_presupuesto_number
  // en la migración), null en presupuestos de antes de esta función.
  number: number | null;
  pdf_path: string | null;
  sent_at: string | null;
  approved_at: string | null;
  created_at: string;
};
