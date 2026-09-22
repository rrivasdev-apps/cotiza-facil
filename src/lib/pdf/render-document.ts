import {
  getSectionMargins,
  GRADIENT_ANGLES,
  type AlignH,
  type AlignV,
  type FieldCatalogEntry,
  type FieldStyle,
  type HeaderFooterConfig,
  type HeaderFooterElement,
  type PageWithSections,
  type Presupuesto,
  type PresupuestoItem,
  type SectionWithFields,
  type Template,
  type ThemeFont,
} from "@/lib/types";
import { escapeHtml } from "@/lib/html-escape";
import { renderCompositeTemplate } from "@/lib/composite-template";
import { collectSectionTotalFields, formatMoney, formatQuantity, grandTotal, lineTotal } from "@/lib/presupuesto-items";

// Documento imprimible para el PDF real: cada página de la plantilla
// (template_pages) es su propia hoja física tamaño Carta
// (816x1056px @96dpi = 8.5x11in), con page-break-after real. El
// encabezado/pie es uno solo por plantilla pero cada página elige si
// lo muestra (page.show_header/show_footer).

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";

const FONT_FAMILY: Record<ThemeFont, string> = {
  manrope: "'Manrope', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  "jetbrains-mono": "'JetBrains Mono', ui-monospace, monospace",
};

const FLAT_PAGE_BG = "#050505";

// swapped invierte inicio/fin del degradado — se usa en páginas pares
// cuando theme.alternatePageTheme está activo (ver renderPresupuestoPdfHtml).
function pageBackground(theme: Template["theme"], swapped = false): string {
  if (theme.gradientFrom && theme.gradientTo) {
    const angle = GRADIENT_ANGLES[theme.gradientDirection];
    const stop = Math.min(100, Math.max(0, theme.gradientStop ?? 0));
    const from = swapped ? theme.gradientTo : theme.gradientFrom;
    const to = swapped ? theme.gradientFrom : theme.gradientTo;
    return `linear-gradient(${angle}deg, ${escapeAttr(from)} ${stop}%, ${escapeAttr(to)} 100%)`;
  }
  return FLAT_PAGE_BG;
}

// Para valores que van dentro de un atributo CSS (colores del theme):
// solo se aceptan si matchean el formato esperado, cualquier otra cosa
// se descarta — el usuario no debería poder inyectar CSS/HTML vía un
// campo de color guardado en la base.
function escapeAttr(value: string | null | undefined): string {
  if (!value) return "";
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "";
}

// "left" mapea a "stretch" (no "flex-start") a propósito: el contenido
// de una sección (filas de tabla_datos, párrafos) está pensado para
// ocupar el ancho completo de la página — centrar o alinear a la
// derecha lo angosta a su contenido, como una portada.
function bodyAlignItems(h: AlignH): string {
  return h === "center" ? "center" : h === "right" ? "flex-end" : "stretch";
}

function bodyTextAlign(h: AlignH): string {
  return h;
}

function bodyJustify(v: AlignV): string {
  return v === "center" ? "center" : v === "bottom" ? "flex-end" : "flex-start";
}

function bandJustify(h: AlignH): string {
  return h === "center" ? "center" : h === "right" ? "flex-end" : "flex-start";
}

function bandAlign(v: AlignV): string {
  return v === "center" ? "center" : v === "bottom" ? "flex-end" : "flex-start";
}

function formatFieldValue(raw: string | string[] | undefined, dataType: string): string {
  if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
    return `<span style="color:rgba(255,255,255,0.35)">—</span>`;
  }

  if (dataType === "lista" && Array.isArray(raw)) {
    return `<ul style="padding-left:1.2rem;margin:0">${raw
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("")}</ul>`;
  }

  const value = Array.isArray(raw) ? raw.join(", ") : raw;

  if (dataType === "moneda") {
    const num = Number(value);
    return Number.isFinite(num)
      ? `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
      : escapeHtml(value);
  }

  if (dataType === "fecha" && value) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? escapeHtml(value) : escapeHtml(parsed.toLocaleDateString("es-AR"));
  }

  if (dataType === "texto_largo") {
    return `<span style="white-space:pre-wrap">${escapeHtml(value)}</span>`;
  }

  return escapeHtml(value);
}

const labelStyleAttr = `color:#fff;font-size:13px;letter-spacing:0.04em;text-transform:uppercase`;

// Override de estilo (font-family/font-size/bold/italic/underline)
// guardado en label_style o value_style de template_section_fields.
// Se agrega al final del style inline del contenedor, para que gane
// sobre el font-size/color por defecto del tipo de sección —
// font-family/font-size son heredables, así que alcanza con setearlo
// ahí, no en cada span hijo.
function styleAttr(style: FieldStyle): string {
  const parts: string[] = [];
  if (style.fontFamily) parts.push(`font-family:${FONT_FAMILY[style.fontFamily]}`);
  if (style.fontSize) parts.push(`font-size:${style.fontSize}px`);
  if (style.bold) parts.push(`font-weight:700`);
  if (style.italic) parts.push(`font-style:italic`);
  if (style.underline) parts.push(`text-decoration:underline`);
  return parts.length > 0 ? `;${parts.join(";")}` : "";
}

function renderLogo(logoPath: string | null | undefined, fallbackName: string, size = 64): string {
  if (logoPath && /^https?:\/\//.test(logoPath)) {
    return `<img src="${escapeHtml(logoPath)}" alt="Logo" style="height:${size}px;width:auto;max-width:100%" />`;
  }
  const parts = fallbackName.trim().split(/\s+/);
  const [a, ...rest] = parts;
  const b = rest.join(" ");
  const fontSize = Math.round(size * 0.62);
  return `
    <div style="display:inline-flex;align-items:stretch">
      <span style="font-size:${fontSize}px;padding:8px 11px;background:#fff;color:#000">${escapeHtml(a)}</span>
      ${b ? `<span style="font-size:${fontSize}px;padding:8px 11px;background:#000;color:#fff;border:1px solid rgba(255,255,255,0.15)">${escapeHtml(b)}</span>` : ""}
    </div>`;
}

function renderRule(accent: string, margin = "16px 0 18px"): string {
  return `<div style="height:4px;background:${escapeAttr(accent) || "#fff"};margin:${margin}"></div>`;
}

function renderMasthead(clientName: string): string {
  return `
    <div style="text-align:center;font-size:28px;letter-spacing:0.01em">
      <span style="color:transparent;-webkit-text-stroke:0.9px #fff">PRESUPUESTO</span>
      <span style="color:#fff;text-transform:uppercase">${escapeHtml(clientName)}</span>
    </div>`;
}

function renderHeaderFooterElement(
  element: HeaderFooterElement,
  theme: Template["theme"],
  template: Template,
  pageIndex: number,
  totalPages: number,
): string {
  switch (element.type) {
    case "logo":
      return renderLogo(theme.logoPath, template.name, 32);
    case "page_number":
      return `<span style="color:#fff;font-size:12px">Página ${pageIndex + 1} de ${totalPages}</span>`;
    case "texto":
      return `<span style="color:#fff;font-size:12px">${escapeHtml(element.text)}</span>`;
  }
}

function renderBand(
  config: HeaderFooterConfig,
  theme: Template["theme"],
  template: Template,
  pageIndex: number,
  totalPages: number,
): string {
  return `
    <div style="display:flex;justify-content:${bandJustify(config.alignH)};align-items:${bandAlign(config.alignV)};gap:16px;min-height:32px">
      ${config.elements.map((el) => renderHeaderFooterElement(el, theme, template, pageIndex, totalPages)).join("")}
    </div>`;
}

// Para una "línea combinada" (sin field_catalog_id propio): resuelve
// sus tokens {{id:<uuid>}} contra los campos de TODA la plantilla, no
// solo los de esta sección — puede referenciar un campo de otra
// sección/página del mismo presupuesto.
function renderCompositeLine(
  sf: SectionWithFields["fields"][number],
  data: Presupuesto["data"],
  fieldsById: Map<string, FieldCatalogEntry>,
): string {
  return escapeHtml(renderCompositeTemplate(sf.composite_template ?? "", data, fieldsById));
}

function renderItemsTable(items: PresupuestoItem[], accent: string): string {
  const accentColor = escapeAttr(accent) || "#fff";
  const headerCell = `padding-bottom:8px;border-bottom:1px solid ${accentColor};${labelStyleAttr}`;
  const bodyCell = "padding:12px 8px;color:#fff;font-size:16px;vertical-align:top;border-bottom:1px solid rgba(255,255,255,0.12)";

  return `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;${headerCell}">Cant.</th>
          <th style="text-align:left;${headerCell}">Concepto</th>
          <th style="text-align:right;${headerCell}">Precio Unit.</th>
          <th style="text-align:right;${headerCell}">Precio Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
        <tr>
          <td style="${bodyCell}">${escapeHtml(formatQuantity(item.cantidad))}</td>
          <td style="${bodyCell};white-space:pre-wrap">${escapeHtml(item.concepto)}</td>
          <td style="${bodyCell};text-align:right">${escapeHtml(formatMoney(Number(item.precioUnitario) || 0))}</td>
          <td style="${bodyCell};text-align:right">${escapeHtml(formatMoney(lineTotal(item)))}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px 8px 0 0;color:#fff;font-size:18px;font-weight:700;text-align:right">Total General:</td>
          <td style="padding:12px 0 0 8px;color:#fff;font-size:18px;font-weight:700;text-align:right">${escapeHtml(formatMoney(grandTotal(items)))}</td>
        </tr>
      </tfoot>
    </table>`;
}

function renderDatosCliente(
  clientName: string,
  createdAt: string,
  number: number | null,
  accent: string,
): string {
  const accentColor = escapeAttr(accent) || "#fff";
  const fecha = new Date(createdAt);
  const fechaLabel = Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-AR");
  const row = (label: string, value: string) => `
    <div style="display:flex;justify-content:space-between;padding:6px 0">
      <span style="${labelStyleAttr}">${escapeHtml(label)}</span>
      <span style="color:#fff;font-size:16px">${escapeHtml(value)}</span>
    </div>`;

  return `
    <div style="border:1px solid ${accentColor};border-radius:8px;padding:16px 20px">
      ${row("Cliente", clientName)}
      ${row("Fecha", fechaLabel)}
      ${number !== null ? row("N° Presupuesto", String(number).padStart(4, "0")) : ""}
    </div>`;
}

function renderSectionBody(
  section: SectionWithFields,
  data: Presupuesto["data"],
  theme: Template["theme"],
  templateName: string,
  clientName: string,
  fieldsById: Map<string, FieldCatalogEntry>,
  items: PresupuestoItem[],
  createdAt: string,
  number: number | null,
): string {
  const visibleFields = section.fields.filter((sf) => sf.visible);

  if (section.type === "tabla_items") {
    return `
      <div style="${labelStyleAttr};margin-bottom:8px">${escapeHtml(section.title)}</div>
      ${renderItemsTable(items, theme.accent)}`;
  }

  if (section.type === "datos_cliente") {
    return renderDatosCliente(clientName, createdAt, number, theme.accent);
  }

  if (section.type === "portada") {
    return `
      <div style="text-align:center">
        ${renderLogo(theme.logoPath, templateName)}
        ${renderRule(theme.accent)}
        ${renderMasthead(clientName)}
      </div>`;
  }

  if (section.type === "clausulas") {
    return `
      <div style="${labelStyleAttr};margin-bottom:20px">${escapeHtml(section.title)}</div>
      ${visibleFields
        .map((sf) =>
          sf.field
            ? `
        <p style="color:rgba(255,255,255,0.82);font-size:16px;line-height:1.6;margin:0 0 16px${styleAttr(sf.value_style)}">
          <b style="color:#fff${styleAttr(sf.label_style)}">${escapeHtml(sf.field.name)}: </b>${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}
        </p>`
            : `
        <p style="color:rgba(255,255,255,0.82);font-size:16px;line-height:1.6;margin:0 0 16px${styleAttr(sf.value_style)}">
          ${renderCompositeLine(sf, data, fieldsById)}
        </p>`,
        )
        .join("")}`;
  }

  if (section.type === "cierre") {
    return `
      <div style="text-align:center">
        ${visibleFields
          .map((sf) =>
            sf.field
              ? `<div style="color:#fff;font-size:20px;line-height:1.4${styleAttr(sf.value_style)}">${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}</div>`
              : `<div style="color:#fff;font-size:20px;line-height:1.4${styleAttr(sf.value_style)}">${renderCompositeLine(sf, data, fieldsById)}</div>`,
          )
          .join("")}
      </div>`;
  }

  if (section.type === "texto_libre" || section.type === "lista_items") {
    return `
      <div style="${labelStyleAttr};margin-bottom:24px">${escapeHtml(section.title)}</div>
      ${visibleFields
        .map((sf) =>
          sf.field
            ? `
        <div style="margin-bottom:24px">
          <div style="${labelStyleAttr};margin-bottom:8px${styleAttr(sf.label_style)}">${escapeHtml(sf.field.name)}</div>
          <div style="color:#fff;font-size:18px;line-height:1.5${styleAttr(sf.value_style)}">${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}</div>
        </div>`
            : `
        <div style="margin-bottom:24px">
          <div style="color:#fff;font-size:18px;line-height:1.5${styleAttr(sf.value_style)}">${renderCompositeLine(sf, data, fieldsById)}</div>
        </div>`,
        )
        .join("")}`;
  }

  // tabla_datos y genérico: filas grandes clave/valor
  return `
    <div style="${labelStyleAttr};margin-bottom:8px">${escapeHtml(section.title)}</div>
    ${visibleFields
      .map((sf) =>
        sf.field
          ? `
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px;width:100%">
        <div style="${labelStyleAttr};flex:0 0 160px${styleAttr(sf.label_style)}">${escapeHtml(sf.field.name)}:</div>
        <div style="flex:1;color:#fff;font-size:20px;padding-bottom:8px;border-bottom:1px solid ${escapeAttr(theme.accent) || "#fff"}${styleAttr(sf.value_style)}">
          ${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}
        </div>
      </div>`
          : `
      <div style="margin-bottom:16px;width:100%">
        <div style="color:#fff;font-size:20px${styleAttr(sf.value_style)}">
          ${renderCompositeLine(sf, data, fieldsById)}
        </div>
      </div>`,
      )
      .join("")}`;
}

export function renderPresupuestoPdfHtml(
  presupuesto: Presupuesto,
  template: Template,
  pages: PageWithSections[],
): string {
  const { theme } = template;
  // Fondo "por defecto" (sin invertir) — es el que usa la capa fija de
  // respaldo (ver más abajo), que no puede alternar por página: un
  // position:fixed se repite igual en cada página física impresa, no
  // hay forma de variarlo por índice de página con CSS puro. El caso
  // real que cubre esa capa (una sección que desborda a una página
  // física extra, no planeada) es raro y, si coincide con una página
  // par, esa porción sin contenido va a verse con el color de una
  // impar — mejor eso que en blanco.
  const background = pageBackground(theme);
  const fontFamily = FONT_FAMILY[theme.font];
  const totalPages = pages.length;

  // Para resolver los tokens de una "línea combinada" contra un campo
  // de cualquier sección/página, no solo la suya — incluye el Total
  // General de cada tabla_items como un campo moneda más (ver
  // sectionTotalField).
  const fieldsById = new Map<string, FieldCatalogEntry>();
  for (const page of pages) {
    for (const section of page.sections) {
      for (const sf of section.fields) {
        if (sf.field) fieldsById.set(sf.field.id, sf.field);
      }
    }
  }
  for (const field of collectSectionTotalFields(pages.flatMap((p) => p.sections))) {
    fieldsById.set(field.id, field);
  }

  const pagesHtml = pages.map((page, pageIndex) => {
    const body = `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:${bodyJustify(page.body_align_v)};align-items:${bodyAlignItems(page.body_align_h)};text-align:${bodyTextAlign(page.body_align_h)};gap:36px">
        ${page.sections
          .map((section) => {
            const m = getSectionMargins(section.config);
            const inner = renderSectionBody(
              section,
              presupuesto.data,
              theme,
              template.name,
              presupuesto.client_name,
              fieldsById,
              presupuesto.items[section.id] ?? [],
              presupuesto.created_at,
              presupuesto.number,
            );
            return `<div style="padding:${m.top}px ${m.right}px ${m.bottom}px ${m.left}px">${inner}</div>`;
          })
          .join("")}
      </div>`;

    // pageIndex es 0-based — la página par "de verdad" (2ª, 4ª...) es
    // índice impar acá.
    const isEvenPage = pageIndex % 2 === 1;
    const pageBg = pageBackground(theme, theme.alternatePageTheme && isEvenPage);

    return `
      <div class="page" style="background:${pageBg};font-family:${fontFamily};display:flex;flex-direction:column">
        ${page.show_header ? renderBand(template.header, theme, template, pageIndex, totalPages) : ""}
        ${body}
        ${page.show_footer ? renderBand(template.footer, theme, template, pageIndex, totalPages) : ""}
      </div>`;
  });

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Presupuesto — ${escapeHtml(presupuesto.client_name)}</title>
<link rel="stylesheet" href="${GOOGLE_FONTS_HREF}" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 816px 1056px; margin: 0; }
  html, body { width: 816px; }
  .page {
    width: 816px;
    min-height: 1056px;
    padding: 57px 78px;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  /* Cuando el contenido de una página desborda a una página física
     extra (min-height se queda corto para esa página), el fondo de
     .page termina donde termina el contenido — el resto de esa
     página física queda sin pintar. position:fixed usa cada page box
     como su propio contenedor en paged media, así que este layer se
     repite entero en cada página física impresa, cubriéndola completa
     sin importar cuánto contenido real haya en ella. */
  .page-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 816px;
    height: 1056px;
    background: ${background};
    z-index: -1;
  }
</style>
</head>
<body>
  <div class="page-background"></div>
  ${pagesHtml.join("\n")}
</body>
</html>`;
}
