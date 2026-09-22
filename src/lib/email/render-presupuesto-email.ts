import {
  getSectionMargins,
  type FieldCatalogEntry,
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

// Versión del presupuesto para el CUERPO del correo (no el adjunto):
// misma estructura y datos que el PDF, pero maquetada 100% con
// <table> y estilos inline, sin flexbox/gradientes/@font-face — lo
// único que un cliente de correo (sobre todo Outlook de escritorio,
// que renderiza con el motor de Word) soporta de forma confiable. El
// resultado se parece a la plantilla (mismo acento, logo, orden de
// secciones) pero no es un calco pixel a pixel del PDF.

const EMAIL_WIDTH = 600;

const FONT_STACK: Record<ThemeFont, string> = {
  manrope: "Helvetica, Arial, sans-serif",
  inter: "Helvetica, Arial, sans-serif",
  "jetbrains-mono": "'Courier New', Courier, monospace",
};

const FALLBACK_CARD_BG = "#050505";

// Los degradados no son confiables en correo (Outlook de escritorio
// los ignora) — se usa el color de inicio del degradado como sólido
// de respaldo, o el fondo plano de la plantilla si no tiene degradado.
function cardBackground(theme: Template["theme"]): string {
  if (theme.gradientFrom) return escapeAttr(theme.gradientFrom);
  return FALLBACK_CARD_BG;
}

function escapeAttr(value: string | null | undefined): string {
  if (!value) return "";
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "";
}

function formatFieldValueEmail(raw: string | string[] | undefined, dataType: string): string {
  if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
    return `<span style="color:rgba(255,255,255,0.35)">—</span>`;
  }

  if (dataType === "lista" && Array.isArray(raw)) {
    return `<ul style="padding-left:20px;margin:0">${raw.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  const value = Array.isArray(raw) ? raw.join(", ") : raw;

  if (dataType === "moneda") {
    const num = Number(value);
    return Number.isFinite(num) ? formatMoney(num) : escapeHtml(value);
  }

  if (dataType === "fecha" && value) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? escapeHtml(value) : escapeHtml(parsed.toLocaleDateString("es-AR"));
  }

  return escapeHtml(value);
}

const labelStyle = `color:#fff;font-size:11px;letter-spacing:0.04em;text-transform:uppercase`;

function renderCompositeLineEmail(
  sf: SectionWithFields["fields"][number],
  data: Presupuesto["data"],
  fieldsById: Map<string, FieldCatalogEntry>,
): string {
  return escapeHtml(renderCompositeTemplate(sf.composite_template ?? "", data, fieldsById));
}

function renderLogo(logoPath: string | null | undefined, fallbackName: string, size = 40): string {
  if (logoPath && /^https?:\/\//.test(logoPath)) {
    return `<img src="${escapeHtml(logoPath)}" alt="Logo" width="${size}" style="height:${size}px;width:auto;max-width:100%;display:block" />`;
  }
  return `<span style="font-size:16px;font-weight:700;color:#fff">${escapeHtml(fallbackName)}</span>`;
}

function renderHeaderFooterElement(element: HeaderFooterElement, theme: Template["theme"], templateName: string): string {
  switch (element.type) {
    case "logo":
      return renderLogo(theme.logoPath, templateName, 32);
    case "page_number":
      // No aplica: el correo es una sola vista continua, sin páginas.
      return "";
    case "texto":
      return `<span style="color:#fff;font-size:12px">${escapeHtml(element.text)}</span>`;
  }
}

function renderBand(config: HeaderFooterConfig, theme: Template["theme"], templateName: string): string {
  const items = config.elements.map((el) => renderHeaderFooterElement(el, theme, templateName)).filter(Boolean);
  if (items.length === 0) return "";
  const align = config.alignH === "center" ? "center" : config.alignH === "right" ? "right" : "left";
  return `<div style="text-align:${align}">${items.join('<span style="display:inline-block;width:16px"></span>')}</div>`;
}

function renderItemsTable(items: PresupuestoItem[], accent: string): string {
  const accentColor = escapeAttr(accent) || "#fff";
  const headerCell = `padding-bottom:8px;border-bottom:1px solid ${accentColor};${labelStyle}`;
  const bodyCell = "padding:10px 6px;color:#fff;font-size:14px;vertical-align:top;border-bottom:1px solid rgba(255,255,255,0.12)";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <tr>
        <th align="left" style="${headerCell}">Cant.</th>
        <th align="left" style="${headerCell}">Concepto</th>
        <th align="right" style="${headerCell}">P. Unit.</th>
        <th align="right" style="${headerCell}">P. Total</th>
      </tr>
      ${items
        .map(
          (item) => `
      <tr>
        <td style="${bodyCell}">${escapeHtml(formatQuantity(item.cantidad))}</td>
        <td style="${bodyCell};white-space:pre-wrap">${escapeHtml(item.concepto)}</td>
        <td style="${bodyCell}" align="right">${escapeHtml(formatMoney(Number(item.precioUnitario) || 0))}</td>
        <td style="${bodyCell}" align="right">${escapeHtml(formatMoney(lineTotal(item)))}</td>
      </tr>`,
        )
        .join("")}
      <tr>
        <td colspan="3" align="right" style="padding:12px 6px 0 0;color:#fff;font-size:16px;font-weight:700">Total General:</td>
        <td align="right" style="padding:12px 6px 0 0;color:#fff;font-size:16px;font-weight:700">${escapeHtml(formatMoney(grandTotal(items)))}</td>
      </tr>
    </table>`;
}

function renderDatosCliente(clientName: string, createdAt: string, number: number | null, accent: string): string {
  const accentColor = escapeAttr(accent) || "#fff";
  const fecha = new Date(createdAt);
  const fechaLabel = Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-AR");
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 16px;${labelStyle}">${escapeHtml(label)}</td>
      <td align="right" style="padding:6px 16px;color:#fff;font-size:14px">${escapeHtml(value)}</td>
    </tr>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${accentColor};border-radius:8px;border-collapse:separate">
      ${row("Cliente", clientName)}
      ${row("Fecha", fechaLabel)}
      ${number !== null ? row("N° Presupuesto", String(number).padStart(4, "0")) : ""}
    </table>`;
}

function renderSection(
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
  const accentColor = escapeAttr(theme.accent) || "#fff";

  if (section.type === "tabla_items") {
    return `<div style="${labelStyle};margin-bottom:8px">${escapeHtml(section.title)}</div>${renderItemsTable(items, theme.accent)}`;
  }

  if (section.type === "datos_cliente") {
    return renderDatosCliente(clientName, createdAt, number, theme.accent);
  }

  if (section.type === "portada") {
    return `
      <div style="text-align:center">
        ${renderLogo(theme.logoPath, templateName, 48)}
        <div style="height:3px;background:${accentColor};margin:16px auto;width:64px"></div>
        <div style="text-transform:uppercase;font-size:20px;letter-spacing:0.02em;color:#fff">${escapeHtml(clientName)}</div>
      </div>`;
  }

  if (section.type === "clausulas") {
    return `
      <div style="${labelStyle};margin-bottom:12px">${escapeHtml(section.title)}</div>
      ${visibleFields
        .map(
          (sf) => `
      <p style="color:rgba(255,255,255,0.82);font-size:14px;line-height:1.6;margin:0 0 12px">
        ${
          sf.field
            ? `<b style="color:#fff">${escapeHtml(sf.field.name)}: </b>${formatFieldValueEmail(data[sf.field_catalog_id!], sf.field.data_type)}`
            : renderCompositeLineEmail(sf, data, fieldsById)
        }
      </p>`,
        )
        .join("")}`;
  }

  if (section.type === "cierre") {
    return `
      <div style="text-align:center">
        ${visibleFields
          .map(
            (sf) =>
              `<div style="color:#fff;font-size:16px;line-height:1.4">${
                sf.field ? formatFieldValueEmail(data[sf.field_catalog_id!], sf.field.data_type) : renderCompositeLineEmail(sf, data, fieldsById)
              }</div>`,
          )
          .join("")}
      </div>`;
  }

  if (section.type === "texto_libre" || section.type === "lista_items") {
    return `
      <div style="${labelStyle};margin-bottom:16px">${escapeHtml(section.title)}</div>
      ${visibleFields
        .map(
          (sf) => `
      <div style="margin-bottom:16px">
        ${sf.field ? `<div style="${labelStyle};margin-bottom:6px">${escapeHtml(sf.field.name)}</div>` : ""}
        <div style="color:#fff;font-size:14px;line-height:1.5">
          ${sf.field ? formatFieldValueEmail(data[sf.field_catalog_id!], sf.field.data_type) : renderCompositeLineEmail(sf, data, fieldsById)}
        </div>
      </div>`,
        )
        .join("")}`;
  }

  // tabla_datos y genérico: filas clave/valor
  return `
    <div style="${labelStyle};margin-bottom:8px">${escapeHtml(section.title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${visibleFields
        .map(
          (sf) => `
      <tr>
        ${
          sf.field
            ? `
        <td style="padding:6px 0;${labelStyle};width:140px;vertical-align:top">${escapeHtml(sf.field.name)}:</td>
        <td style="padding:6px 0;color:#fff;font-size:15px;border-bottom:1px solid ${accentColor}">
          ${formatFieldValueEmail(data[sf.field_catalog_id!], sf.field.data_type)}
        </td>`
            : `<td colspan="2" style="padding:6px 0;color:#fff;font-size:15px">${renderCompositeLineEmail(sf, data, fieldsById)}</td>`
        }
      </tr>`,
        )
        .join("")}
    </table>`;
}

export function renderPresupuestoEmailHtml(presupuesto: Presupuesto, template: Template, pages: PageWithSections[]): string {
  const { theme } = template;
  const cardBg = cardBackground(theme);
  const fontStack = FONT_STACK[theme.font];

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

  const showHeader = pages.some((p) => p.show_header);
  const showFooter = pages.some((p) => p.show_footer);
  const headerHtml = showHeader ? renderBand(template.header, theme, template.name) : "";
  const footerHtml = showFooter ? renderBand(template.footer, theme, template.name) : "";

  // "portada" está pensada para repetirse una vez por página física
  // (un PDF de varias páginas), donde cada aparición queda separada
  // por un salto de página real. Acá todas las páginas quedan en una
  // sola vista continua — repetir el mismo logo/masthead varias veces
  // seguidas no suma impacto, se ve como un error. Se muestra solo la
  // primera.
  let portadaRendered = false;

  const sectionsHtml = pages
    .flatMap((page) =>
      page.sections
        .filter((section) => {
          if (section.type !== "portada") return true;
          if (portadaRendered) return false;
          portadaRendered = true;
          return true;
        })
        .map((section) => {
          const m = getSectionMargins(section.config);
          const inner = renderSection(
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
          return `<tr><td style="padding:${m.top || 0}px ${40 + (m.right || 0)}px ${24 + (m.bottom || 0)}px ${40 + (m.left || 0)}px">${inner}</td></tr>`;
        }),
    )
    .join("");

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:24px 0">
  <tr>
    <td align="center">
      <table role="presentation" width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" style="background:${cardBg};border-radius:8px;font-family:${fontStack}">
        ${headerHtml ? `<tr><td style="padding:32px 40px 8px">${headerHtml}</td></tr>` : ""}
        <tr><td style="padding:24px 40px 0"><div style="height:1px;background:rgba(255,255,255,0.12)"></div></td></tr>
        ${sectionsHtml}
        ${footerHtml ? `<tr><td style="padding:16px 40px 32px;border-top:1px solid rgba(255,255,255,0.12)">${footerHtml}</td></tr>` : `<tr><td style="height:16px"></td></tr>`}
      </table>
      <table role="presentation" width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px 40px;text-align:center;color:#999;font-size:12px;font-family:${fontStack}">
          El presupuesto completo va adjunto en PDF a este correo.
        </td></tr>
      </table>
    </td>
  </tr>
</table>`;
}
