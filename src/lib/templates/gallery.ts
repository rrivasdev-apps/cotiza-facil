import type {
  AlignH,
  AlignV,
  DataType,
  FieldStyle,
  HeaderFooterConfig,
  SectionType,
  TemplateTheme,
} from "@/lib/types";

// Plantillas de arranque, para que una cuenta nueva no empiece de una
// pantalla en blanco. Son datos estáticos (no filas en la base de
// ninguna cuenta) a propósito: RLS aísla templates por account_id, así
// que "una cuenta modelo que todas leen" implicaría una excepción a esa
// regla — en cambio, elegir una plantilla acá corre el mismo flujo de
// "crear plantilla" de siempre, ya sembrado con esta estructura, directo
// en la cuenta del usuario. Cero riesgo de fuga entre cuentas.
//
// Contenido validado a mano: cada una se armó y se revisó (Estructura +
// vista previa + PDF) en una cuenta de prueba antes de congelarla acá.

// formula/number_in_words_of_name referencian OTRO campo de la MISMA
// plantilla, todavía sin id real (se resuelve recién al sembrar en una
// cuenta) — por eso van como texto con placeholders en vez del
// `{{id:<uuid>}}` que usa el motor en tiempo de ejecución:
//   {{FIELD:<nombre>}}         → el field_catalog_id de ese campo
//   {{SECTION_TOTAL:<índice>}} → el Total General sintético de la
//                                sección tabla_items en esa posición
//                                (0-based, contando todas las
//                                secciones de la plantilla en orden)
// createTemplateFromGallery reescribe estos placeholders a
// `{{id:...}}` reales a medida que va creando cada fila.
export type GalleryFieldDef =
  | {
      kind: "field";
      name: string;
      data_type: DataType;
      required: boolean;
      value_style?: FieldStyle;
      formula?: string | null;
      numberInWordsOfName?: string | null;
    }
  | { kind: "composite"; text: string; required: boolean; value_style?: FieldStyle };

export type GallerySectionDef = {
  type: SectionType;
  title: string;
  config: Record<string, unknown>;
  fields: GalleryFieldDef[];
  // true si esta sección es la que se guarda como total_field_id de la
  // plantilla — solo tiene sentido en una sección "tabla_items" (su
  // Total General sintético), ver sectionTotalFieldId.
  isTotalField: boolean;
};

export type GalleryPageDef = {
  title: string;
  show_header: boolean;
  show_footer: boolean;
  body_align_h: AlignH;
  body_align_v: AlignV;
  sections: GallerySectionDef[];
};

export type GalleryTemplateDef = {
  key: string;
  name: string;
  description: string;
  previewImage: string;
  theme: TemplateTheme;
  header: HeaderFooterConfig;
  footer: HeaderFooterConfig;
  // Nombre del campo (no id — se resuelve al sembrar) que es el total
  // de la plantilla, cuando NO es el Total General de una tabla_items
  // (ver isTotalField arriba). null si la plantilla no declara total.
  totalFieldName: string | null;
  pages: GalleryPageDef[];
};

export const GALLERY_TEMPLATES: GalleryTemplateDef[] = [
  {
    key: "ejecutivo-formal",
    name: "Ejecutivo Formal",
    description: "Estructurado y sobrio, sin degradado — para contratos, obra y servicios B2B.",
    previewImage: "/gallery/ejecutivo-formal.png",
    theme: {
      accent: "#9c8250",
      bgColor: "#050505",
      textColor: "#ffffff",
      gradientFrom: null,
      gradientTo: null,
      gradientDirection: "diagonal-left",
      gradientStop: 0,
      font: "inter",
      logoPath: null,
      backgroundImage: { imagePath: null, opacity: 20, fit: "cover" },
      alternatePageTheme: true,
    },
    header: { alignV: "top", left: { direction: "column", elements: [{ type: "texto", text: "Nombre de tu Empresa · RIF/NIT 00000000-0" }] }, center: { direction: "column", elements: [] }, right: { direction: "column", elements: [] } },
    footer: { alignV: "bottom", left: { direction: "column", elements: [] }, center: { direction: "column", elements: [{ type: "page_number" }] }, right: { direction: "column", elements: [] } },
    totalFieldName: null,
    pages: [
      {
        title: "Página 1",
        show_header: true,
        show_footer: true,
        body_align_h: "left",
        body_align_v: "top",
        sections: [
          { type: "datos_cliente", title: "Datos del Cliente", config: {}, fields: [], isTotalField: false },
          {
            type: "tabla_datos",
            title: "Detalle del Proyecto",
            config: {},
            fields: [
              { kind: "field", name: "Proyecto", data_type: "texto_corto", required: true },
              { kind: "field", name: "Ubicación", data_type: "texto_corto", required: false },
              { kind: "field", name: "Plazo de Ejecución", data_type: "texto_corto", required: false },
              { kind: "field", name: "Modalidad de Pago", data_type: "texto_corto", required: false },
            ],
            isTotalField: false,
          },
          { type: "tabla_items", title: "Presupuesto Detallado", config: {}, fields: [], isTotalField: true },
          {
            type: "clausulas",
            title: "Términos y Condiciones",
            config: {},
            fields: [
              { kind: "composite", text: "Este presupuesto tiene una validez de 30 días corridos.", required: false },
              { kind: "composite", text: "Los precios no incluyen impuestos aplicables.", required: false },
              { kind: "composite", text: "Cualquier modificación al alcance descrito requiere un nuevo presupuesto.", required: false },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [{ kind: "composite", text: "Quedamos a su disposición para cualquier consulta adicional.", required: false }],
            isTotalField: false,
          },
        ],
      },
    ],
  },
  {
    key: "pasteleria-dulce",
    name: "Pastelería Dulce",
    description: "Paleta clara y cálida, con tabla de materiales e ingredientes y cálculo automático de anticipo — para tortas, repostería y pastelería por encargo.",
    previewImage: "/gallery/pasteleria-dulce.png",
    theme: {
      accent: "#e07856",
      bgColor: "#fbf2e6",
      textColor: "#2e3a38",
      gradientFrom: null,
      gradientTo: null,
      gradientDirection: "diagonal-left",
      gradientStop: 0,
      font: "manrope",
      logoPath: null,
      backgroundImage: {
        imagePath: "https://iyvvozkhhrjhdzekrduu.supabase.co/storage/v1/object/public/logos/gallery-assets/pasteleria-dulce-bg.png",
        opacity: 35,
        fit: "cover",
      },
      alternatePageTheme: false,
    },
    header: {
      alignV: "top",
      left: { direction: "column", elements: [{ type: "texto", text: "Pastelería Dulce · pedidos@pasteleriadulce.com" }] },
      center: { direction: "column", elements: [] },
      right: { direction: "column", elements: [] },
    },
    footer: {
      alignV: "bottom",
      left: { direction: "column", elements: [] },
      center: { direction: "column", elements: [{ type: "page_number" }] },
      right: { direction: "column", elements: [] },
    },
    totalFieldName: "Total",
    pages: [
      {
        title: "Página 1",
        show_header: true,
        show_footer: true,
        body_align_h: "left",
        body_align_v: "top",
        sections: [
          {
            type: "titulo",
            title: "Título",
            config: { titulo: { rules: false } },
            fields: [
              {
                kind: "composite",
                text: "Pastelería Dulce / Presupuesto",
                required: false,
                value_style: { fontFamily: null, fontSize: 24, bold: true, italic: false, underline: false, outline: false, outlineSplit: true, align: null, borderTop: false, borderBottom: false, borderLeft: false, borderRight: false, borderColor: null },
              },
            ],
            isTotalField: false,
          },
          { type: "datos_cliente", title: "Datos del Cliente", config: {}, fields: [], isTotalField: false },
          {
            type: "texto_libre",
            title: "Producto",
            config: {},
            fields: [
              {
                kind: "field",
                name: "Producto",
                data_type: "texto_largo",
                required: true,
                value_style: { fontFamily: null, fontSize: 20, bold: true, italic: false, underline: false, outline: false, outlineSplit: false, align: null, borderTop: false, borderBottom: false, borderLeft: false, borderRight: false, borderColor: null },
              },
            ],
            isTotalField: false,
          },
          {
            type: "tabla_items",
            title: "Materiales e Ingredientes",
            config: { rowSpacing: { rowGap: 2 }, title: { show: false } },
            fields: [],
            isTotalField: false,
          },
          {
            type: "tabla_datos",
            title: "Resumen de Costos",
            config: { rowSpacing: { rowGap: 2 } },
            fields: [
              { kind: "field", name: "Subtotal", data_type: "moneda", required: false, formula: "{{SECTION_TOTAL:3}}" },
              { kind: "field", name: "Elaboración y Decoración", data_type: "moneda", required: false },
              { kind: "field", name: "Total", data_type: "moneda", required: false, formula: "{{FIELD:Subtotal}} + {{FIELD:Elaboración y Decoración}}" },
              { kind: "field", name: "Anticipo (50%)", data_type: "moneda", required: false, formula: "{{FIELD:Total}} * 0.5" },
              { kind: "field", name: "Saldo", data_type: "moneda", required: false, formula: "{{FIELD:Total}} - {{FIELD:Anticipo (50%)}}" },
            ],
            isTotalField: false,
          },
          {
            type: "clausulas",
            title: "Entrega y Condiciones",
            config: {},
            fields: [
              { kind: "field", name: "Fecha de Entrega", data_type: "fecha", required: false },
              { kind: "composite", text: "Validez del presupuesto: 7 días desde la fecha de emisión.", required: false },
              { kind: "field", name: "Observaciones", data_type: "texto_largo", required: false },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [{ kind: "composite", text: "¡Gracias por tu pedido! Endulzamos tu celebración.", required: false }],
            isTotalField: false,
          },
        ],
      },
    ],
  },
];
