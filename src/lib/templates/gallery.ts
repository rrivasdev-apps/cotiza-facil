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
  {
    key: "contrato-tecnico",
    name: "Contrato Técnico",
    description: "Tipografía monoespaciada, acento neón sobre negro — para desarrollo de software e integraciones.",
    previewImage: "/gallery/contrato-tecnico.png",
    theme: {
      accent: "#00e6a8",
      gradientFrom: "#000000",
      gradientTo: "#0a2e24",
      gradientDirection: "vertical",
      gradientStop: 0,
      font: "jetbrains-mono",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "right", alignV: "top", elements: [{ type: "texto", text: "SISTEMA · CONTRATO DE SERVICIOS TÉCNICOS" }] },
    footer: { alignH: "center", alignV: "bottom", elements: [{ type: "texto", text: "Documento confidencial" }, { type: "page_number" }] },
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
          {
            type: "tabla_datos",
            title: "Especificaciones del Sistema",
            config: {},
            fields: [
              { kind: "field", name: "Sistema", data_type: "texto_corto", required: true },
              { kind: "field", name: "Versión", data_type: "texto_corto", required: false },
              { kind: "field", name: "Entorno", data_type: "texto_corto", required: false },
              { kind: "field", name: "Nivel de Soporte", data_type: "texto_corto", required: false },
            ],
            isTotalField: false,
          },
          { type: "tabla_items", title: "Alcance Técnico", config: {}, fields: [], isTotalField: true },
          {
            type: "clausulas",
            title: "Cláusulas Técnicas",
            config: {},
            fields: [
              { kind: "composite", text: "Este contrato se rige por los términos de servicio estándar de la empresa, disponibles en el sitio web oficial.", required: false },
              { kind: "composite", text: "El código fuente desarrollado queda bajo licencia exclusiva del cliente una vez cancelado el 100% del presupuesto.", required: false },
              { kind: "composite", text: "Cualquier cambio de alcance no contemplado en este documento se cotiza por separado, previa aprobación por escrito.", required: false },
              { kind: "composite", text: "El soporte post-lanzamiento cubre corrección de errores, no nuevas funcionalidades ni cambios de diseño.", required: false },
              { kind: "composite", text: "Los tiempos de entrega están sujetos a la disponibilidad de información y accesos por parte del cliente.", required: false },
              { kind: "composite", text: "Este presupuesto tiene una validez de 20 días hábiles a partir de la fecha de emisión.", required: false },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [{ kind: "composite", text: "Firma técnica válida electrónicamente.", required: false }],
            isTotalField: false,
          },
        ],
      },
    ],
  },
  {
    key: "presupuesto-de-lujo",
    name: "Presupuesto de Lujo",
    description: "Degradado dorado, encabezado con logo + texto, lista de beneficios — para proyectos premium.",
    previewImage: "/gallery/presupuesto-de-lujo.png",
    theme: {
      accent: "#d4af37",
      gradientFrom: "#0d0d0d",
      gradientTo: "#3d3016",
      gradientDirection: "diagonal-right",
      gradientStop: 75,
      font: "manrope",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "center", alignV: "top", elements: [{ type: "logo" }, { type: "texto", text: "Colección Premium" }] },
    footer: { alignH: "center", alignV: "bottom", elements: [{ type: "texto", text: "Gracias por confiar en nosotros" }] },
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
          {
            type: "tabla_datos",
            title: "Detalle del Proyecto",
            config: {},
            fields: [
              { kind: "field", name: "Proyecto", data_type: "texto_corto", required: true },
              { kind: "field", name: "Estilo", data_type: "texto_corto", required: false },
              { kind: "field", name: "Materiales Principales", data_type: "texto_largo", required: false },
            ],
            isTotalField: false,
          },
          {
            type: "texto_libre",
            title: "Qué Incluye",
            config: {},
            fields: [{ kind: "field", name: "Incluye", data_type: "lista", required: false }],
            isTotalField: false,
          },
          { type: "tabla_items", title: "Inversión", config: {}, fields: [], isTotalField: true },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [
              {
                kind: "composite",
                text: "Una experiencia diseñada a tu medida.",
                required: false,
                value_style: { fontFamily: null, fontSize: 26, bold: true, italic: true, underline: false, align: null },
              },
            ],
            isTotalField: false,
          },
        ],
      },
    ],
  },
  {
    key: "recibo-compacto",
    name: "Recibo Compacto",
    description: "Denso y directo, con el monto destacado en grande — para pagos y recibos rápidos.",
    previewImage: "/gallery/recibo-compacto.png",
    theme: {
      accent: "#4a90d9",
      gradientFrom: null,
      gradientTo: null,
      gradientDirection: "diagonal-left",
      gradientStop: 0,
      font: "inter",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "left", alignV: "top", elements: [{ type: "texto", text: "Recibo Rápido" }, { type: "page_number" }] },
    footer: { alignH: "right", alignV: "bottom", elements: [{ type: "texto", text: "Procesado electrónicamente" }] },
    totalFieldName: "Monto Recibido",
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
            title: "Detalle del Pago",
            config: {},
            fields: [
              {
                kind: "field",
                name: "Concepto",
                data_type: "texto_corto",
                required: true,
                value_style: { fontFamily: null, fontSize: 13, bold: false, italic: false, underline: false, align: null },
              },
              {
                kind: "field",
                name: "Fecha de Pago",
                data_type: "fecha",
                required: false,
                value_style: { fontFamily: null, fontSize: 13, bold: false, italic: false, underline: false, align: null },
              },
              {
                kind: "field",
                name: "Método de Pago",
                data_type: "texto_corto",
                required: false,
                value_style: { fontFamily: null, fontSize: 13, bold: false, italic: false, underline: false, align: null },
              },
              {
                kind: "field",
                name: "Monto Recibido",
                data_type: "moneda",
                required: true,
                value_style: { fontFamily: null, fontSize: 22, bold: true, italic: false, underline: false, align: null },
              },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [
              {
                kind: "composite",
                text: "Conservá este comprobante.",
                required: false,
                value_style: { fontFamily: null, fontSize: 12, bold: false, italic: false, underline: false, align: null },
              },
            ],
            isTotalField: false,
          },
        ],
      },
    ],
  },
  {
    key: "propuesta-editorial",
    name: "Propuesta Editorial",
    description: "Degradado en bloque, tipografía grande y en negrita — para propuestas creativas y de branding.",
    previewImage: "/gallery/propuesta-editorial.png",
    theme: {
      accent: "#ff3b6a",
      gradientFrom: "#0a0014",
      gradientTo: "#4a0a2e",
      gradientDirection: "horizontal",
      gradientStop: 60,
      font: "manrope",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "left", alignV: "top", elements: [] },
    footer: { alignH: "center", alignV: "bottom", elements: [{ type: "texto", text: "Una propuesta pensada para vos" }] },
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
          {
            type: "lista_items",
            title: "Lo Que Proponemos",
            config: {},
            fields: [
              {
                kind: "field",
                name: "Visión del Proyecto",
                data_type: "texto_largo",
                required: false,
                value_style: { fontFamily: null, fontSize: 18, bold: false, italic: false, underline: false, align: null },
              },
              {
                kind: "field",
                name: "Nuestro Enfoque",
                data_type: "texto_largo",
                required: false,
                value_style: { fontFamily: null, fontSize: 18, bold: false, italic: false, underline: false, align: null },
              },
              {
                kind: "field",
                name: "Resultados Esperados",
                data_type: "texto_largo",
                required: false,
                value_style: { fontFamily: null, fontSize: 18, bold: false, italic: false, underline: false, align: null },
              },
            ],
            isTotalField: false,
          },
        ],
      },
      {
        title: "Página 2",
        show_header: true,
        show_footer: true,
        body_align_h: "left",
        body_align_v: "top",
        sections: [
          { type: "tabla_items", title: "Inversión", config: {}, fields: [], isTotalField: true },
          {
            type: "clausulas",
            title: "Condiciones",
            config: {},
            fields: [
              { kind: "composite", text: "Propuesta válida por 15 días.", required: false },
              { kind: "composite", text: "50% de anticipo para iniciar el proyecto.", required: false },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [
              {
                kind: "composite",
                text: "Creemos en ideas que se atreven a ser diferentes.",
                required: false,
                value_style: { fontFamily: null, fontSize: 28, bold: true, italic: true, underline: false, align: null },
              },
            ],
            isTotalField: false,
          },
        ],
      },
    ],
  },
  {
    key: "cotizacion-calculo",
    name: "Cotización con Cálculo Automático",
    description: "Subtotal, IVA, total y monto en letras calculados solos a partir de los ítems — para ingeniería y proyectos técnicos.",
    previewImage: "/gallery/cotizacion-calculo.png",
    theme: {
      accent: "#2fb8a3",
      gradientFrom: "#04141c",
      gradientTo: "#0c3b46",
      gradientDirection: "diagonal-left",
      gradientStop: 0,
      font: "inter",
      logoPath: null,
      alternatePageTheme: true,
    },
    header: { alignH: "right", alignV: "top", elements: [{ type: "texto", text: "Ingeniería y Proyectos · presupuestos@empresa.com" }] },
    footer: { alignH: "center", alignV: "bottom", elements: [{ type: "page_number" }] },
    totalFieldName: "Total a Pagar",
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
            title: "Datos del Proyecto",
            config: {},
            fields: [
              { kind: "field", name: "Proyecto", data_type: "texto_corto", required: true },
              { kind: "field", name: "Norma Aplicable", data_type: "texto_corto", required: false },
              { kind: "field", name: "Responsable Técnico", data_type: "texto_corto", required: false },
            ],
            isTotalField: false,
          },
          { type: "tabla_items", title: "Materiales y Mano de Obra", config: {}, fields: [], isTotalField: false },
          {
            type: "tabla_datos",
            title: "Resumen de Costos",
            config: {},
            fields: [
              {
                kind: "field",
                name: "Subtotal",
                data_type: "moneda",
                required: false,
                formula: "{{SECTION_TOTAL:2}}",
              },
              {
                kind: "field",
                name: "IVA (16%)",
                data_type: "moneda",
                required: false,
                formula: "{{FIELD:Subtotal}} * 0.16",
              },
              {
                kind: "field",
                name: "Total a Pagar",
                data_type: "moneda",
                required: false,
                formula: "{{FIELD:Subtotal}} + {{FIELD:IVA (16%)}}",
              },
              {
                kind: "field",
                name: "Total en Letras",
                data_type: "texto_largo",
                required: false,
                numberInWordsOfName: "Total a Pagar",
              },
            ],
            isTotalField: false,
          },
          {
            type: "cierre",
            title: "Cierre",
            config: {},
            fields: [{ kind: "composite", text: "Presupuesto sujeto a revisión técnica final.", required: false }],
            isTotalField: false,
          },
        ],
      },
    ],
  },
];
