import type {
  AlignH,
  AlignV,
  HeaderFooterConfig,
  HeaderFooterElement,
  PageWithSections,
  Presupuesto,
  SectionWithFields,
  Template,
  TemplateSectionField,
  ThemeFont,
} from "@/lib/types";
import { escapeHtml } from "@/lib/html-escape";

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

function pageBackground(theme: Template["theme"]): string {
  if (theme.gradientFrom && theme.gradientTo) {
    return `linear-gradient(135deg, ${escapeAttr(theme.gradientFrom)}, ${escapeAttr(theme.gradientTo)})`;
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

// Override de tipografía por campo (font-family/font-size guardados en
// template_section_fields). Se agrega al final del style inline del
// contenedor del valor, para que gane sobre el font-size por defecto
// del tipo de sección — font-family/font-size son heredables, así que
// alcanza con setearlo ahí, no en cada span hijo.
function fieldStyleAttr(sf: Pick<TemplateSectionField, "font_family" | "font_size">): string {
  const parts: string[] = [];
  if (sf.font_family) parts.push(`font-family:${FONT_FAMILY[sf.font_family]}`);
  if (sf.font_size) parts.push(`font-size:${sf.font_size}px`);
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

function renderSectionBody(section: SectionWithFields, data: Presupuesto["data"], theme: Template["theme"], templateName: string): string {
  if (section.type === "portada") {
    return `
      <div style="text-align:center">
        ${renderLogo(theme.logoPath, templateName)}
        ${renderRule(theme.accent)}
      </div>`;
  }

  if (section.type === "clausulas") {
    return `
      <div style="${labelStyleAttr};margin-bottom:20px">${escapeHtml(section.title)}</div>
      ${section.fields
        .map(
          (sf) => `
        <p style="color:rgba(255,255,255,0.82);font-size:16px;line-height:1.6;margin:0 0 16px${fieldStyleAttr(sf)}">
          <b style="color:#fff">${escapeHtml(sf.field.name)}: </b>${formatFieldValue(data[sf.field_catalog_id], sf.field.data_type)}
        </p>`,
        )
        .join("")}`;
  }

  if (section.type === "cierre") {
    return `
      <div style="text-align:center">
        ${section.fields
          .map(
            (sf) =>
              `<div style="color:#fff;font-size:20px;line-height:1.4${fieldStyleAttr(sf)}">${formatFieldValue(data[sf.field_catalog_id], sf.field.data_type)}</div>`,
          )
          .join("")}
      </div>`;
  }

  if (section.type === "texto_libre" || section.type === "lista_items") {
    return `
      <div style="${labelStyleAttr};margin-bottom:24px">${escapeHtml(section.title)}</div>
      ${section.fields
        .map(
          (sf) => `
        <div style="margin-bottom:24px">
          <div style="${labelStyleAttr};margin-bottom:8px">${escapeHtml(sf.field.name)}</div>
          <div style="color:#fff;font-size:18px;line-height:1.5${fieldStyleAttr(sf)}">${formatFieldValue(data[sf.field_catalog_id], sf.field.data_type)}</div>
        </div>`,
        )
        .join("")}`;
  }

  // tabla_datos y genérico: filas grandes clave/valor
  return `
    <div style="${labelStyleAttr};margin-bottom:8px">${escapeHtml(section.title)}</div>
    ${section.fields
      .map(
        (sf) => `
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px;width:100%">
        <div style="${labelStyleAttr};flex:0 0 160px">${escapeHtml(sf.field.name)}:</div>
        <div style="flex:1;color:#fff;font-size:20px;padding-bottom:8px;border-bottom:1px solid ${escapeAttr(theme.accent) || "#fff"}${fieldStyleAttr(sf)}">
          ${formatFieldValue(data[sf.field_catalog_id], sf.field.data_type)}
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
  const background = pageBackground(theme);
  const fontFamily = FONT_FAMILY[theme.font];
  const totalPages = pages.length;

  const pagesHtml = pages.map((page, pageIndex) => {
    const showMasthead = page.sections.some((s) => s.type === "portada");
    const body = `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:${bodyJustify(page.body_align_v)};align-items:${bodyAlignItems(page.body_align_h)};text-align:${bodyTextAlign(page.body_align_h)};gap:36px">
        ${showMasthead ? renderMasthead(presupuesto.client_name) : ""}
        ${page.sections.map((section) => renderSectionBody(section, presupuesto.data, theme, template.name)).join("")}
      </div>`;

    return `
      <div class="page" style="background:${background};font-family:${fontFamily};display:flex;flex-direction:column">
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
    height: 1056px;
    padding: 57px 78px;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
</style>
</head>
<body>
  ${pagesHtml.join("\n")}
</body>
</html>`;
}
