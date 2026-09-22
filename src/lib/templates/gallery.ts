import type {
  AlignH,
  AlignV,
  DataType,
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

export type GalleryFieldDef =
  | { kind: "field"; name: string; data_type: DataType; required: boolean }
  | { kind: "composite"; text: string; required: boolean };

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
    key: "minimalista-oscuro",
    name: "Minimalista Oscuro",
    description: "Plano, sin degradado, mucho espacio en blanco — para consultoría y servicios profesionales.",
    previewImage: "/gallery/minimalista-oscuro.png",
    theme: {
      accent: "#8a92a3",
      gradientFrom: null,
      gradientTo: null,
      gradientDirection: "diagonal-left",
      gradientStop: 0,
      font: "inter",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "right", alignV: "top", elements: [{ type: "texto", text: "Estudio Profesional · contacto@estudio.com" }] },
    footer: { alignH: "center", alignV: "bottom", elements: [{ type: "page_number" }] },
    totalFieldName: "Inversión Total",
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
            title: "Alcance del Servicio",
            config: {},
            fields: [
              { kind: "field", name: "Servicio Contratado", data_type: "texto_corto", required: true },
              { kind: "field", name: "Alcance", data_type: "texto_largo", required: false },
              { kind: "field", name: "Duración Estimada", data_type: "texto_corto", required: false },
              { kind: "field", name: "Inversión Total", data_type: "moneda", required: true },
            ],
            isTotalField: false,
          },
          {
            type: "clausulas",
            title: "Condiciones",
            config: {},
            fields: [
              { kind: "composite", text: "Validez de esta propuesta: 15 días desde la fecha de emisión.", required: false },
              { kind: "composite", text: "Forma de pago: 50% al inicio, 50% contra entrega.", required: false },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [{ kind: "composite", text: "Gracias por la confianza.", required: false }],
            isTotalField: false,
          },
        ],
      },
    ],
  },
  {
    key: "oscuro-degradado",
    name: "Oscuro con Degradado",
    description: "Fondo con degradado que se invierte en páginas pares, portada con logo — para marcas con identidad fuerte.",
    previewImage: "/gallery/oscuro-degradado.png",
    theme: {
      accent: "#8b6bff",
      gradientFrom: "#0a0a12",
      gradientTo: "#3a2a7a",
      gradientDirection: "vertical",
      gradientStop: 0,
      font: "manrope",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "right", alignV: "top", elements: [{ type: "texto", text: "Nombre de tu Empresa · www.tuempresa.com" }] },
    footer: { alignH: "left", alignV: "bottom", elements: [{ type: "texto", text: "Equipo Comercial" }] },
    totalFieldName: null,
    pages: [
      {
        title: "Página 1",
        show_header: true,
        show_footer: true,
        body_align_h: "left",
        body_align_v: "top",
        sections: [
          { type: "portada", title: "Portada", config: {}, fields: [], isTotalField: false },
          { type: "datos_cliente", title: "Datos del Cliente", config: {}, fields: [], isTotalField: false },
        ],
      },
      {
        title: "Página 2",
        show_header: true,
        show_footer: true,
        body_align_h: "left",
        body_align_v: "top",
        sections: [
          { type: "tabla_items", title: "Presupuesto", config: {}, fields: [], isTotalField: true },
          {
            type: "clausulas",
            title: "Condiciones",
            config: {},
            fields: [
              { kind: "composite", text: "Precios expresados en dólares (USD).", required: false },
              { kind: "composite", text: "Validez de la propuesta: 10 días.", required: false },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [{ kind: "composite", text: "Quedamos atentos a tu confirmación.", required: false }],
            isTotalField: false,
          },
        ],
      },
    ],
  },
  {
    key: "ejecutivo-formal",
    name: "Ejecutivo Formal",
    description: "Estructurado y sobrio, sin degradado — para contratos, obra y servicios B2B.",
    previewImage: "/gallery/ejecutivo-formal.png",
    theme: {
      accent: "#9c8250",
      gradientFrom: null,
      gradientTo: null,
      gradientDirection: "diagonal-left",
      gradientStop: 0,
      font: "inter",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "left", alignV: "top", elements: [{ type: "texto", text: "Nombre de tu Empresa · RIF/NIT 00000000-0" }] },
    footer: { alignH: "center", alignV: "bottom", elements: [{ type: "page_number" }] },
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
    key: "items-cotizacion",
    name: "Ítems y Cotización",
    description: "Centrado en la tabla de ítems (cant. × precio) — para quien cotiza productos o trabajos por partida.",
    previewImage: "/gallery/items-cotizacion.png",
    theme: {
      accent: "#e8672c",
      gradientFrom: null,
      gradientTo: null,
      gradientDirection: "diagonal-left",
      gradientStop: 0,
      font: "manrope",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "left", alignV: "top", elements: [{ type: "texto", text: "Nombre de tu Negocio · +00 000 000 0000" }] },
    footer: { alignH: "right", alignV: "bottom", elements: [{ type: "page_number" }] },
    totalFieldName: null,
    pages: [
      {
        title: "Página 1",
        show_header: true,
        show_footer: true,
        body_align_h: "left",
        body_align_v: "top",
        sections: [
          { type: "portada", title: "Portada", config: {}, fields: [], isTotalField: false },
          { type: "datos_cliente", title: "Datos del Cliente", config: {}, fields: [], isTotalField: false },
          { type: "tabla_items", title: "Cotización", config: {}, fields: [], isTotalField: true },
          {
            type: "clausulas",
            title: "Condiciones",
            config: {},
            fields: [
              { kind: "composite", text: "Precios sujetos a disponibilidad de stock.", required: false },
              { kind: "composite", text: "Forma de pago: contado o transferencia bancaria.", required: false },
            ],
            isTotalField: false,
          },
        ],
      },
    ],
  },
  {
    key: "evento-creativo",
    name: "Evento y Creativo",
    description: "Degradado vivo, portada grande, más visual — para DJs, fotógrafos y organizadores de eventos.",
    previewImage: "/gallery/evento-creativo.png",
    theme: {
      accent: "#ff8a3d",
      gradientFrom: "#1a0512",
      gradientTo: "#ff7a1a",
      gradientDirection: "diagonal-left",
      gradientStop: 0,
      font: "manrope",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "left", alignV: "top", elements: [] },
    footer: { alignH: "center", alignV: "bottom", elements: [{ type: "texto", text: "¡Gracias por elegirnos!" }] },
    totalFieldName: "Inversión Total",
    pages: [
      {
        title: "Página 1",
        show_header: true,
        show_footer: true,
        body_align_h: "left",
        body_align_v: "top",
        sections: [
          { type: "portada", title: "Portada", config: {}, fields: [], isTotalField: false },
          { type: "datos_cliente", title: "Datos del Cliente", config: {}, fields: [], isTotalField: false },
          {
            type: "tabla_datos",
            title: "Detalle del Evento",
            config: {},
            fields: [
              { kind: "field", name: "Tipo de Evento", data_type: "texto_corto", required: true },
              { kind: "field", name: "Locación", data_type: "texto_corto", required: false },
              { kind: "field", name: "Fecha del Evento", data_type: "fecha", required: false },
              { kind: "field", name: "Duración", data_type: "texto_corto", required: false },
              { kind: "field", name: "Inversión Total", data_type: "moneda", required: true },
            ],
            isTotalField: false,
          },
          {
            type: "clausulas",
            title: "Incluye / No Incluye",
            config: {},
            fields: [
              { kind: "composite", text: "Incluye: montaje, equipo técnico y coordinación el día del evento.", required: false },
              { kind: "composite", text: "No incluye: traslados, permisos municipales ni gastos no especificados.", required: false },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [{ kind: "composite", text: "¡Hagamos de tu evento algo inolvidable!", required: false }],
            isTotalField: false,
          },
        ],
      },
    ],
  },
];
