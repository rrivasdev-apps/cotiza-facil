import type { Presupuesto, SectionWithFields, Template, ThemeFont } from "@/lib/types";
import { escapeHtml } from "@/lib/html-escape";

// Documento imprimible para el PDF real: a diferencia de la vista previa
// en pantalla (una sola página continua), acá cada sección es su propia
// hoja física tamaño Carta (816x1056px @96dpi = 8.5x11in), con
// page-break-after real — así el resultado se parece al artifact
// original y al PDF que ya usa Luis (portada, detalles, términos, cierre
// como páginas separadas).

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

function renderLogo(logoPath: string | null | undefined, fallbackName: string): string {
  if (logoPath && /^https?:\/\//.test(logoPath)) {
    return `<div style="text-align:center"><img src="${escapeHtml(logoPath)}" alt="Logo" style="height:64px;width:auto;max-width:100%" /></div>`;
  }
  const parts = fallbackName.trim().split(/\s+/);
  const [a, ...rest] = parts;
  const b = rest.join(" ");
  return `
    <div style="display:flex;justify-content:center">
      <div style="display:inline-flex;align-items:stretch">
        <span style="font-size:40px;padding:8px 11px;background:#fff;color:#000">${escapeHtml(a)}</span>
        ${b ? `<span style="font-size:40px;padding:8px 11px;background:#000;color:#fff;border:1px solid rgba(255,255,255,0.15)">${escapeHtml(b)}</span>` : ""}
      </div>
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

function renderSectionBody(section: SectionWithFields, data: Presupuesto["data"], accent: string): string {
  if (section.type === "clausulas") {
    return `
      <div style="${labelStyleAttr};margin-bottom:20px">${escapeHtml(section.title)}</div>
      ${section.fields
        .map(
          (sf) => `
        <p style="color:rgba(255,255,255,0.82);font-size:16px;line-height:1.6;margin:0 0 16px">
          <b style="color:#fff">${escapeHtml(sf.field.name)}: </b>${formatFieldValue(data[sf.field_catalog_id], sf.field.data_type)}
        </p>`,
        )
        .join("")}`;
  }

  if (section.type === "cierre") {
    return `
      <div style="text-align:center;margin-top:auto;padding-top:22px">
        ${section.fields
          .map(
            (sf) =>
              `<div style="color:#fff;font-size:20px;line-height:1.4">${formatFieldValue(data[sf.field_catalog_id], sf.field.data_type)}</div>`,
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
          <div style="color:#fff;font-size:18px;line-height:1.5">${formatFieldValue(data[sf.field_catalog_id], sf.field.data_type)}</div>
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
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px">
        <div style="${labelStyleAttr};flex:0 0 160px">${escapeHtml(sf.field.name)}:</div>
        <div style="flex:1;color:#fff;font-size:20px;padding-bottom:8px;border-bottom:1px solid ${escapeAttr(accent) || "#fff"}">
          ${formatFieldValue(data[sf.field_catalog_id], sf.field.data_type)}
        </div>
      </div>`,
      )
      .join("")}`;
}

function renderPage(background: string, fontFamily: string, inner: string): string {
  return `
    <div class="page" style="background:${background};font-family:${fontFamily}">
      ${inner}
    </div>`;
}

export function renderPresupuestoPdfHtml(
  presupuesto: Presupuesto,
  template: Template,
  sections: SectionWithFields[],
): string {
  const { theme } = template;
  const background = pageBackground(theme);
  const fontFamily = FONT_FAMILY[theme.font];
  const portada = sections.find((s) => s.type === "portada");
  const rest = sections.filter((s) => s.type !== "portada");

  const coverInner = `
    <div style="text-align:center">
      ${renderLogo(theme.logoPath, template.name)}
      ${renderRule(theme.accent)}
      ${renderMasthead(presupuesto.client_name)}
      ${portada && portada.title !== "Portada" ? `<div style="${labelStyleAttr};margin-top:12px;text-align:center">${escapeHtml(portada.title)}</div>` : ""}
    </div>`;

  const pages = [renderPage(background, fontFamily, coverInner)];

  for (const section of rest) {
    const inner = `
      <div style="display:flex;flex-direction:column;height:100%">
        ${renderMasthead(presupuesto.client_name)}
        ${renderRule(theme.accent, "24px 0 28px")}
        <div style="flex:1;display:flex;flex-direction:column">
          ${renderSectionBody(section, presupuesto.data, theme.accent)}
        </div>
      </div>`;
    pages.push(renderPage(background, fontFamily, inner));
  }

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
  ${pages.join("\n")}
</body>
</html>`;
}
