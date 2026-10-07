import {
  type BackgroundImageConfig,
  DEFAULT_SECTION_TITLE,
  getColumnsConfig,
  getDatosClienteFields,
  getHideTitle,
  getMastheadStyle,
  getRowSpacingConfig,
  getSectionMargins,
  getSectionTitleConfig,
  getTablaItemsBorders,
  getTituloConfig,
  GRADIENT_ANGLES,
  type AlignH,
  type AlignV,
  type ColumnBorders,
  type DatosClienteFields,
  type FieldCatalogEntry,
  type FieldStyle,
  type HeaderFooterConfig,
  type HeaderFooterElement,
  type HeaderFooterZone,
  type HeaderFooterZoneKey,
  HEADER_FOOTER_ZONES,
  type MastheadStyle,
  type PageWithSections,
  type Presupuesto,
  type PresupuestoItem,
  type SectionTitleConfig,
  type SectionWithFields,
  type TablaItemsBordersConfig,
  type Template,
  type ThemeFont,
} from "@/lib/types";
import { escapeHtml } from "@/lib/html-escape";
import { renderCompositeTemplate } from "@/lib/composite-template";
import { collectSectionTotalFields, formatMoney, formatQuantity, grandTotal, lineTotal } from "@/lib/presupuesto-items";
import { buildSocialUrl, SOCIAL_ICON_PATHS } from "@/lib/social-icons";
import { buildClientFieldsSeed, CLIENT_PSEUDO_FIELDS } from "@/lib/client-fields";
import { backgroundImageFitStyle } from "@/lib/background-image";

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

const FALLBACK_BG = "#050505";

// swapped invierte inicio/fin del degradado — se usa en páginas pares
// cuando theme.alternatePageTheme está activo (ver renderPresupuestoPdfHtml).
// La página impar es sólido "from" hasta stop%, degrada, y termina
// sólido "to" en 100% — ej. negro sólido hasta 60%, degrada a rojo,
// termina en rojo. La página par tiene que arrancar exactamente en
// ese mismo color (rojo) y degradar de vuelta a "from" (negro),
// terminando ese degradado en (100 - stop)% para después quedar
// sólido negro el resto de la página — el espejo de la impar, no una
// repetición del mismo 60% con los colores invertidos.
function pageBackground(theme: Template["theme"], swapped = false): string {
  if (theme.gradientFrom && theme.gradientTo) {
    const angle = GRADIENT_ANGLES[theme.gradientDirection];
    const rawStop = Math.min(100, Math.max(0, theme.gradientStop ?? 0));
    const from = swapped ? theme.gradientTo : theme.gradientFrom;
    const to = swapped ? theme.gradientFrom : theme.gradientTo;
    const firstStop = swapped ? 0 : rawStop;
    const secondStop = swapped ? 100 - rawStop : 100;
    return `linear-gradient(${angle}deg, ${escapeAttr(from)} ${firstStop}%, ${escapeAttr(to)} ${secondStop}%)`;
  }
  return escapeAttr(theme.bgColor) || FALLBACK_BG;
}

// Para valores que van dentro de un atributo CSS (colores del theme):
// solo se aceptan si matchean el formato esperado, cualquier otra cosa
// se descarta — el usuario no debería poder inyectar CSS/HTML vía un
// campo de color guardado en la base.
function escapeAttr(value: string | null | undefined): string {
  if (!value) return "";
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "";
}

// Se inserta como primer hijo de cada .page (ver el CSS .page-bg-image
// en renderPresupuestoPdfHtml) — la opacidad va en esta capa sola,
// nunca en el contenido, para que la imagen se vea "lavada" sobre el
// color/degradado sin afectar la legibilidad del texto.
function renderBackgroundImageLayer(config: BackgroundImageConfig): string {
  if (!config.imagePath) return "";
  const fit = backgroundImageFitStyle(config.fit);
  const opacity = Math.min(100, Math.max(0, config.opacity)) / 100;
  return `<div class="page-bg-image" style="background-image:url(${escapeHtml(config.imagePath)});background-size:${fit.backgroundSize};background-repeat:${fit.backgroundRepeat};background-position:${fit.backgroundPosition};opacity:${opacity}"></div>`;
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

function bandAlign(v: AlignV): string {
  return v === "center" ? "center" : v === "bottom" ? "flex-end" : "flex-start";
}

function formatFieldValue(raw: string | string[] | undefined, dataType: string): string {
  if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
    return `<span style="opacity:0.35">—</span>`;
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

const labelStyleAttr = `font-size:13px;letter-spacing:0.04em;text-transform:uppercase`;

// Override de estilo (font-family/font-size/bold/italic/underline)
// guardado en label_style o value_style de template_section_fields.
// Se agrega al final del style inline del contenedor, para que gane
// sobre el font-size/color por defecto del tipo de sección —
// font-family/font-size son heredables, así que alcanza con setearlo
// ahí, no en cada span hijo. textColor es el color de tinta del tema
// — el contorno (outline) lo usa como color del trazo, ya que el
// relleno va transparente.
function styleAttr(style: FieldStyle, textColor: string, accent: string): string {
  const parts: string[] = [];
  if (style.fontFamily) parts.push(`font-family:${FONT_FAMILY[style.fontFamily]}`);
  if (style.fontSize) parts.push(`font-size:${style.fontSize}px`);
  if (style.bold) parts.push(`font-weight:700`);
  if (style.italic) parts.push(`font-style:italic`);
  if (style.underline) parts.push(`text-decoration:underline`);
  if (style.align) parts.push(`text-align:${style.align}`);
  if (style.outline) parts.push(`color:transparent`, `-webkit-text-stroke:0.9px ${escapeAttr(textColor) || "#fff"}`);
  // Línea por lado — el diseñador de bordes es la única fuente de estas
  // líneas. Color: el que haya elegido el usuario, o el acento del tema.
  const borderColor = escapeAttr(style.borderColor ?? accent) || "#fff";
  if (style.borderTop) parts.push(`border-top:1px solid ${borderColor}`);
  if (style.borderBottom) parts.push(`border-bottom:1px solid ${borderColor}`);
  if (style.borderLeft) parts.push(`border-left:1px solid ${borderColor}`);
  if (style.borderRight) parts.push(`border-right:1px solid ${borderColor}`);
  return parts.length > 0 ? `;${parts.join(";")}` : "";
}

// Ver la misma nota en hasAnyBorder() de presupuesto-preview.tsx.
function hasAnyBorder(style: FieldStyle): boolean {
  return style.borderTop || style.borderBottom || style.borderLeft || style.borderRight;
}

// Mismo mecanismo que styleAttr() pero para SectionTitleConfig
// (título de sección, no campo) — sin outline, con un tamaño por
// defecto propio porque el título de sección no hereda del theme
// igual que un campo.
function titleStyleAttr(config: SectionTitleConfig, defaultFontSize: number): string {
  const parts: string[] = [];
  if (config.fontFamily) parts.push(`font-family:${FONT_FAMILY[config.fontFamily]}`);
  parts.push(`font-size:${config.fontSize ?? defaultFontSize}px`);
  parts.push(`font-weight:${config.bold ? 700 : 400}`);
  if (config.italic) parts.push(`font-style:italic`);
  if (config.underline) parts.push(`text-decoration:underline`);
  parts.push(`text-align:${config.align}`);
  return parts.length > 0 ? `;${parts.join(";")}` : "";
}

// Ver la nota gemela en presupuesto-preview.tsx — mismo mecanismo,
// versión string para el HTML del PDF.
function renderTitleContentHtml(text: string, outlineSplit: boolean, textColor: string): string {
  if (outlineSplit) {
    const idx = text.indexOf("/");
    if (idx !== -1) {
      return `<span style="color:transparent;-webkit-text-stroke:0.9px ${escapeAttr(textColor) || "#fff"}">${escapeHtml(text.slice(0, idx))}</span>${escapeHtml(text.slice(idx))}`;
    }
  }
  return escapeHtml(text);
}

function renderLogo(logoPath: string | null | undefined, fallbackName: string, size = 64): string {
  if (logoPath && /^https?:\/\//.test(logoPath)) {
    // max-height/max-width + width/height:auto (no dimensión fija) a
    // propósito: si la sección queda angosta (menos ancho por sus
    // márgenes), el logo se achica para entrar sin deformarse — con
    // una altura fija y solo max-width, el ancho se recortaba pero el
    // alto se mantenía igual, estirando la imagen.
    return `<img src="${escapeHtml(logoPath)}" alt="Logo" style="max-height:${size}px;max-width:100%;width:auto;height:auto" />`;
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

function renderMasthead(clientName: string, style: MastheadStyle, textColor: string): string {
  const fontSize = style.fontSize ?? 28;
  const fontWeight = style.bold ? 700 : 400;
  return `
    <div style="text-align:${style.align};font-size:${fontSize}px;font-weight:${fontWeight};letter-spacing:0.01em">
      <span style="color:transparent;-webkit-text-stroke:0.9px ${escapeAttr(textColor) || "#fff"}">PRESUPUESTO</span>
      <span style="text-transform:uppercase">${escapeHtml(clientName)}</span>
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
      return `<span style="font-size:12px">Página ${pageIndex + 1} de ${totalPages}</span>`;
    case "texto":
      return `<span style="font-size:12px">${escapeHtml(element.text)}</span>`;
    case "social": {
      const url = buildSocialUrl(element.network, element.handle);
      return `<a href="${escapeHtml(url)}" style="display:inline-flex;align-items:center;gap:6px;color:inherit;font-size:12px;text-decoration:none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="${SOCIAL_ICON_PATHS[element.network]}"/></svg>
        <span>${escapeHtml(element.handle)}</span>
      </a>`;
    }
  }
}

function zoneAlign(zoneKey: HeaderFooterZoneKey): string {
  return zoneKey === "center" ? "center" : zoneKey === "right" ? "flex-end" : "flex-start";
}

function renderZone(
  zoneKey: HeaderFooterZoneKey,
  zone: HeaderFooterZone,
  theme: Template["theme"],
  template: Template,
  pageIndex: number,
  totalPages: number,
): string {
  const justify = zone.direction === "row" ? zoneAlign(zoneKey) : "flex-start";
  const align = zone.direction === "row" ? "center" : zoneAlign(zoneKey);
  return `
    <div style="flex:1;display:flex;flex-direction:${zone.direction};justify-content:${justify};align-items:${align};gap:8px">
      ${zone.elements.map((el) => renderHeaderFooterElement(el, theme, template, pageIndex, totalPages)).join("")}
    </div>`;
}

function renderBand(
  config: HeaderFooterConfig,
  theme: Template["theme"],
  template: Template,
  pageIndex: number,
  totalPages: number,
): string {
  return `
    <div style="display:flex;align-items:${bandAlign(config.alignV)};gap:16px;min-height:32px">
      ${HEADER_FOOTER_ZONES.map((z) => renderZone(z.value, config[z.value], theme, template, pageIndex, totalPages)).join("")}
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

// Mismo mecanismo que styleAttr(), pero para ColumnBorders
// (tabla_items) — ver la nota en TablaItemsBordersConfig sobre por
// qué tabla_items no puede reusar FieldStyle/styleAttr().
function columnBorderAttr(borders: ColumnBorders, accent: string): string {
  const color = escapeAttr(borders.borderColor ?? accent) || "#fff";
  const parts: string[] = [];
  if (borders.borderTop) parts.push(`border-top:1px solid ${color}`);
  if (borders.borderBottom) parts.push(`border-bottom:1px solid ${color}`);
  if (borders.borderLeft) parts.push(`border-left:1px solid ${color}`);
  if (borders.borderRight) parts.push(`border-right:1px solid ${color}`);
  return parts.length > 0 ? `;${parts.join(";")}` : "";
}

function renderItemsTable(
  items: PresupuestoItem[],
  accent: string,
  rowGap: number,
  columnBorders: TablaItemsBordersConfig,
): string {
  const accentColor = escapeAttr(accent) || "#fff";
  const headerCell = `padding-bottom:8px;border-bottom:1px solid ${accentColor};${labelStyleAttr}`;
  // rowGap/2 arriba y abajo de cada celda — ver la misma nota en
  // presupuesto-preview.tsx (una tabla no tiene row-gap real).
  const vPad = rowGap / 2;
  // Divisor gris neutro (no currentColor) a propósito: tiene que verse
  // sutil tanto en tema claro como oscuro, no seguir el color de texto
  // a opacidad completa.
  const bodyCell = `padding:${vPad}px 8px;font-size:16px;vertical-align:top;border-bottom:1px solid rgba(128,128,128,0.25)`;

  return `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;${headerCell}${columnBorderAttr(columnBorders.cantidad, accent)}">Cant.</th>
          <th style="text-align:left;${headerCell}${columnBorderAttr(columnBorders.concepto, accent)}">Concepto</th>
          <th style="text-align:right;${headerCell}${columnBorderAttr(columnBorders.precioUnitario, accent)}">Precio Unit.</th>
          <th style="text-align:right;${headerCell}${columnBorderAttr(columnBorders.precioTotal, accent)}">Precio Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `
        <tr>
          <td style="${bodyCell}${columnBorderAttr(columnBorders.cantidad, accent)}">${escapeHtml(formatQuantity(item.cantidad))}</td>
          <td style="${bodyCell};white-space:pre-wrap${columnBorderAttr(columnBorders.concepto, accent)}">${escapeHtml(item.concepto)}</td>
          <td style="${bodyCell};text-align:right${columnBorderAttr(columnBorders.precioUnitario, accent)}">${escapeHtml(formatMoney(Number(item.precioUnitario) || 0))}</td>
          <td style="${bodyCell};text-align:right${columnBorderAttr(columnBorders.precioTotal, accent)}">${escapeHtml(formatMoney(lineTotal(item)))}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:${vPad}px 8px 0 0;font-size:18px;font-weight:700;text-align:right">Total General:</td>
          <td style="padding:${vPad}px 0 0 8px;font-size:18px;font-weight:700;text-align:right">${escapeHtml(formatMoney(grandTotal(items)))}</td>
        </tr>
      </tfoot>
    </table>`;
}

function renderDatosCliente(
  clientName: string,
  clientEmail: string,
  clientPhone: string | null,
  clientAddress: string | null,
  fields: DatosClienteFields,
  createdAt: string,
  number: number | null,
  accent: string,
): string {
  const accentColor = escapeAttr(accent) || "#fff";
  const fecha = new Date(createdAt);
  // timeZone explícito: createdAt es un timestamptz real, y el server
  // que genera el PDF puede correr en un huso distinto al de Venezuela
  // — sin esto, la fecha mostrada podría no coincidir con el día de
  // calendario real de cuando se creó el presupuesto.
  const fechaLabel = Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-AR", { timeZone: "America/Caracas" });
  const row = (label: string, value: string) => `
    <div style="display:flex;justify-content:space-between;padding:6px 0">
      <span style="${labelStyleAttr}">${escapeHtml(label)}</span>
      <span style="font-size:16px">${escapeHtml(value)}</span>
    </div>`;

  return `
    <div style="border:1px solid ${accentColor};border-radius:8px;padding:16px 20px">
      ${row("Cliente", clientName)}
      ${fields.showEmail && clientEmail ? row("Correo", clientEmail) : ""}
      ${fields.showPhone && clientPhone ? row("Teléfono", clientPhone) : ""}
      ${fields.showAddress && clientAddress ? row("Dirección", clientAddress) : ""}
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
  clientEmail: string,
  clientPhone: string | null,
  clientAddress: string | null,
  fieldsById: Map<string, FieldCatalogEntry>,
  items: PresupuestoItem[],
  createdAt: string,
  number: number | null,
): string {
  const visibleFields = section.fields.filter((sf) => sf.visible);

  const textColor = theme.textColor;

  if (section.type === "tabla_items") {
    // show:true por defecto — antes de esto el título siempre se
    // imprimía fijo, así que una plantilla ya armada no puede cambiar
    // de aspecto solo por esta migración (ver el mismo criterio en
    // tabla_datos/clausulas más abajo).
    const itemsTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, show: true });
    const itemsTitleHtml = itemsTitleConfig.show
      ? `<div style="${titleStyleAttr(itemsTitleConfig, 13)};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">${escapeHtml(section.title)}</div>`
      : "";
    const itemsRowGap = getRowSpacingConfig(section.config, { rowGap: 24 }).rowGap;
    const itemsBorders = getTablaItemsBorders(section.config);
    return `${itemsTitleHtml}${renderItemsTable(items, theme.accent, itemsRowGap, itemsBorders)}`;
  }

  if (section.type === "datos_cliente") {
    const titleConfig = getSectionTitleConfig(section.config);
    const titleHtml = titleConfig.show
      ? `<div style="${titleStyleAttr(titleConfig, 16)};margin-bottom:12px">${escapeHtml(section.title)}</div>`
      : "";
    return `${titleHtml}${renderDatosCliente(clientName, clientEmail, clientPhone, clientAddress, getDatosClienteFields(section.config), createdAt, number, theme.accent)}`;
  }

  if (section.type === "portada") {
    return `
      <div style="text-align:center">
        ${renderLogo(theme.logoPath, templateName, 140)}
        ${renderRule(theme.accent)}
        ${renderMasthead(clientName, getMastheadStyle(section.config), textColor)}
      </div>`;
  }

  if (section.type === "clausulas") {
    const clausulasTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, show: true });
    const clausulasTitleHtml = clausulasTitleConfig.show
      ? `<div style="${titleStyleAttr(clausulasTitleConfig, 13)};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:20px">${escapeHtml(section.title)}</div>`
      : "";
    // color (no opacity) a propósito: opacity afectaría también al <b>
    // de abajo, que debe quedar a tinta completa — color sí se puede
    // pisar por elemento.
    const mutedColor = `color-mix(in srgb, ${escapeAttr(textColor) || "#fff"} 82%, transparent)`;
    return `
      ${clausulasTitleHtml}
      ${visibleFields
        .map((sf) =>
          sf.field
            ? `
        <p style="color:${mutedColor};font-size:16px;line-height:1.6;margin:0 0 16px${styleAttr(sf.value_style, textColor, theme.accent)}">
          <b style="color:${escapeAttr(textColor) || "#fff"}${styleAttr(sf.label_style, textColor, theme.accent)}">${escapeHtml(sf.field.name)}: </b>${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}
        </p>`
            : `
        <p style="color:${mutedColor};font-size:16px;line-height:1.6;margin:0 0 16px${styleAttr(sf.value_style, textColor, theme.accent)}">
          ${renderCompositeLine(sf, data, fieldsById)}
        </p>`,
        )
        .join("")}`;
  }

  if (section.type === "cierre") {
    const cierreTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, align: "center" });
    const cierreTitleHtml = cierreTitleConfig.show
      ? `<div style="${titleStyleAttr(cierreTitleConfig, 16)};margin-bottom:12px">${escapeHtml(section.title)}</div>`
      : "";
    return `
      <div style="text-align:center">
        ${cierreTitleHtml}
        ${visibleFields
          .map((sf) =>
            sf.field
              ? `<div style="font-size:20px;line-height:1.4${styleAttr(sf.value_style, textColor, theme.accent)}">${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}</div>`
              : `<div style="font-size:20px;line-height:1.4${styleAttr(sf.value_style, textColor, theme.accent)}">${renderCompositeLine(sf, data, fieldsById)}</div>`,
          )
          .join("")}
      </div>`;
  }

  if (section.type === "titulo") {
    const tituloConfig = getTituloConfig(section.config);
    const rule = `<div style="height:3px;background:${escapeAttr(theme.accent) || "#fff"};width:100%"></div>`;
    return `
      ${tituloConfig.rules ? `${rule}<div style="height:12px"></div>` : ""}
      <div style="text-align:center">
        ${visibleFields
          .map((sf) => {
            const isTextField = sf.field && (sf.field.data_type === "texto_corto" || sf.field.data_type === "texto_largo");
            const plainText = !sf.field
              ? renderCompositeTemplate(sf.composite_template ?? "", data, fieldsById)
              : isTextField
                ? String(data[sf.field_catalog_id!] ?? "")
                : null;
            const content =
              plainText !== null
                ? renderTitleContentHtml(plainText, sf.value_style.outlineSplit, textColor)
                : sf.field
                  ? formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)
                  : "";
            return `
        <div style="font-size:32px;font-weight:700;line-height:1.2;letter-spacing:0.01em;margin-bottom:8px${styleAttr(sf.value_style, textColor, theme.accent)}">
          ${content}
        </div>`;
          })
          .join("")}
      </div>
      ${tituloConfig.rules ? `<div style="height:12px"></div>${rule}` : ""}`;
  }

  if (section.type === "dos_columnas") {
    const cols = getColumnsConfig(section.config);
    const columnsTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, show: true });
    const columnsTitleHtml = columnsTitleConfig.show
      ? `<div style="${titleStyleAttr(columnsTitleConfig, 13)};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px">${escapeHtml(section.title)}</div>`
      : "";
    return `
      ${columnsTitleHtml}
      ${visibleFields
        .map((sf) =>
          sf.field
            ? `
      <div style="display:flex;width:100%;gap:24px;margin-bottom:12px">
        <div style="flex:0 0 ${cols.leftPercent}%;${labelStyleAttr}${styleAttr(sf.label_style, textColor, theme.accent)}">${escapeHtml(sf.field.name)}</div>
        <div style="flex:0 0 ${100 - cols.leftPercent}%;font-size:15px;line-height:1.5${styleAttr(sf.value_style, textColor, theme.accent)}">
          ${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}
        </div>
      </div>`
            : `
      <div style="font-size:15px;line-height:1.5;margin-bottom:12px${styleAttr(sf.value_style, textColor, theme.accent)}">
        ${renderCompositeLine(sf, data, fieldsById)}
      </div>`,
        )
        .join("")}`;
  }

  if (section.type === "texto_libre" || section.type === "lista_items") {
    return `
      ${getHideTitle(section.config) ? "" : `<div style="${labelStyleAttr};margin-bottom:24px">${escapeHtml(section.title)}</div>`}
      ${visibleFields
        .map((sf) =>
          sf.field
            ? `
        <div style="margin-bottom:24px">
          <div style="${labelStyleAttr};margin-bottom:8px${styleAttr(sf.label_style, textColor, theme.accent)}">${escapeHtml(sf.field.name)}</div>
          <div style="font-size:18px;line-height:1.5${styleAttr(sf.value_style, textColor, theme.accent)}">${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}</div>
        </div>`
            : `
        <div style="margin-bottom:24px">
          <div style="font-size:18px;line-height:1.5${styleAttr(sf.value_style, textColor, theme.accent)}">${renderCompositeLine(sf, data, fieldsById)}</div>
        </div>`,
        )
        .join("")}`;
  }

  // tabla_datos y genérico: filas grandes clave/valor
  const tableTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, show: true });
  const tableTitleHtml = tableTitleConfig.show
    ? `<div style="${titleStyleAttr(tableTitleConfig, 13)};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">${escapeHtml(section.title)}</div>`
    : "";
  const tableRowGap = getRowSpacingConfig(section.config).rowGap;
  return `
    ${tableTitleHtml}
    ${visibleFields
      .map((sf) =>
        sf.field
          ? `
      <div style="display:flex;align-items:${hasAnyBorder(sf.label_style) || hasAnyBorder(sf.value_style) ? "flex-start" : "baseline"};gap:12px;margin-bottom:${tableRowGap}px;width:100%">
        <div style="${labelStyleAttr};flex:0 0 160px${styleAttr(sf.label_style, textColor, theme.accent)}">${escapeHtml(sf.field.name)}:</div>
        <div style="flex:1;font-size:20px;padding-bottom:8px${styleAttr(sf.value_style, textColor, theme.accent)}">
          ${formatFieldValue(data[sf.field_catalog_id!], sf.field.data_type)}
        </div>
      </div>`
          : `
      <div style="margin-bottom:${tableRowGap}px;width:100%">
        <div style="font-size:20px${styleAttr(sf.value_style, textColor, theme.accent)}">
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
  catalogFields: FieldCatalogEntry[],
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
  // de cualquier sección/página, no solo la suya — arranca con todo
  // el catálogo de la cuenta (un campo puede referenciarse aunque ya
  // no esté usado como campo directo en ningún lado de la plantilla,
  // por ejemplo si esa página se borró después de crear el
  // presupuesto) e incluye el Total General de cada tabla_items como
  // un campo moneda más (ver sectionTotalField).
  const fieldsById = new Map<string, FieldCatalogEntry>();
  for (const field of catalogFields) fieldsById.set(field.id, field);
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
  for (const field of CLIENT_PSEUDO_FIELDS) fieldsById.set(field.id, field);

  // Igual que el Total General de cada tabla_items, pero sin persistir
  // en presupuesto.data (ver client-fields.ts): se mezcla recién acá,
  // leyendo siempre client_name/client_email/... de la fila, nunca una
  // copia vieja.
  const data: Presupuesto["data"] = {
    ...presupuesto.data,
    ...buildClientFieldsSeed(presupuesto.client_name, presupuesto.client_email, presupuesto.client_phone, presupuesto.client_address),
  };

  const pagesHtml = pages.map((page, pageIndex) => {
    const body = `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:${bodyJustify(page.body_align_v)};align-items:${bodyAlignItems(page.body_align_h)};text-align:${bodyTextAlign(page.body_align_h)}">
        ${page.sections
          .map((section) => {
            const m = getSectionMargins(section.config);
            const inner = renderSectionBody(
              section,
              data,
              theme,
              template.name,
              presupuesto.client_name,
              presupuesto.client_email,
              presupuesto.client_phone,
              presupuesto.client_address,
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
      <div class="page" style="background:${pageBg};color:${escapeAttr(theme.textColor) || "#fff"};font-family:${fontFamily};display:flex;flex-direction:column">
        ${renderBackgroundImageLayer(theme.backgroundImage)}
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
    position: relative;
    z-index: 0;
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
  /* A diferencia de .page-background (fija, detrás de TODO), esta va
     DENTRO de cada .page — si fuera otra capa fija como la de arriba,
     el fondo propio de .page (sólido u degradado, pintado en su mismo
     elemento) la taparía siempre; acá, con position:relative en .page,
     z-index:-1 solo la manda detrás del contenido de ESA página, pero
     sigue pintándose encima del color/degradado de fondo. */
  .page-bg-image {
    position: absolute;
    inset: 0;
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
