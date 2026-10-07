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
  getTablaItemsRules,
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
  type TablaItemsRulesConfig,
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

// Tamaño físico de cada hoja (Carta @96dpi) y los dos márgenes fijos
// que antes vivían como padding de .page — ver la nota grande en
// renderPresupuestoPdfHtml sobre por qué ya no pueden ser padding.
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;
const H_PAD = 78;
const V_SAFE = 57;
// Alto reservado para el encabezado/pie, además de V_SAFE, cuando la
// página los muestra — una franja (min-height:32px en renderBand) con
// algo de aire. No hay forma de medir el alto real desde el HTML que
// se genera acá (depende de cómo envuelva el texto en el navegador
// que arma el PDF), así que es una estimación conservadora para el
// caso típico (una fila de logo/texto/redes); un encabezado o pie
// inusualmente alto (varios elementos apilados en columna) podría
// solaparse con el contenido en vez de empujarlo — ver la nota en
// renderFixedBand.
const BAND_RESERVE = 56;

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

// El color/degradado y la imagen de fondo de una página entera, como
// capa position:fixed del tamaño exacto de la hoja — ver la nota
// grande en renderPresupuestoPdfHtml sobre por qué ya no se pinta como
// background propio de .page.
function renderPageBackgroundLayer(pageBg: string, image: BackgroundImageConfig): string {
  const fit = backgroundImageFitStyle(image.fit);
  const opacity = Math.min(100, Math.max(0, image.opacity)) / 100;
  const imageLayer = image.imagePath
    ? `<div style="position:absolute;inset:0;background-image:url(${escapeHtml(image.imagePath)});background-size:${fit.backgroundSize};background-repeat:${fit.backgroundRepeat};background-position:${fit.backgroundPosition};opacity:${opacity}"></div>`
    : "";
  return `<div class="page-bg"><div style="position:absolute;inset:0;background:${pageBg}"></div>${imageLayer}</div>`;
}

// Encabezado/pie como capa position:fixed — se repite en cada hoja
// física (no solo en la primera/última). align-items empuja la franja
// hacia el lado del contenido (abajo para el encabezado, arriba para
// el pie), dejando V_SAFE de aire hacia el borde físico — el mismo
// lugar donde se veía cuando vivía en flujo normal dentro del padding
// de .page.
// Antes había acá también una "máscara" (una tira recortada con
// clip-path, repintando el fondo encima de cualquier cosa que cayera
// en esta franja) para tapar contenido que se desbordara hasta el
// margen en una hoja de desborde — se sacó: el padding-top/bottom de
// más abajo (topZone/bottomZone) SOLO empuja el contenido en el primer
// y último fragmento de .page (ver la nota grande), así que en una
// hoja de desborde intermedia el contenido real (filas de una tabla,
// por ejemplo) sí puede cruzar hasta ahí — y la máscara lo tapaba
// completo, en vez de solo visualmente recortarlo, haciendo
// desaparecer filas enteras sin ningún aviso. Mejor un encabezado/pie
// que a veces se superponga visualmente con contenido en ese caso
// límite (incómodo pero visible) que datos reales invisibles.
function renderFixedBand(
  config: HeaderFooterConfig,
  theme: Template["theme"],
  template: Template,
  pageIndex: number,
  edge: "top" | "bottom",
): string {
  const edgePos = edge === "top" ? "top:0" : "bottom:0";
  const align = edge === "top" ? "flex-end" : "flex-start";
  return `
    <div style="position:fixed;${edgePos};left:${H_PAD}px;right:${H_PAD}px;height:${V_SAFE + BAND_RESERVE}px;z-index:2;display:flex;align-items:${align}">
      ${renderBand(config, theme, template, pageIndex)}
    </div>`;
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
function titleStyleAttr(config: SectionTitleConfig, defaultFontSize: number, accent: string): string {
  const parts: string[] = [];
  if (config.fontFamily) parts.push(`font-family:${FONT_FAMILY[config.fontFamily]}`);
  parts.push(`font-size:${config.fontSize ?? defaultFontSize}px`);
  parts.push(`font-weight:${config.bold ? 700 : 400}`);
  if (config.italic) parts.push(`font-style:italic`);
  if (config.underline) parts.push(`text-decoration:underline`);
  parts.push(`text-align:${config.align}`);
  if (config.chip) {
    const accentColor = escapeAttr(accent) || "#fff";
    parts.push(
      `display:inline-block`,
      `background:color-mix(in srgb, ${accentColor} 15%, transparent)`,
      `color:${accentColor}`,
      `padding:4px 14px`,
      `border-radius:999px`,
    );
  }
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
): string {
  switch (element.type) {
    case "logo":
      return renderLogo(theme.logoPath, template.name, 32);
    case "page_number":
      // Texto final ("Página X de Y" en hojas físicas reales, no en
      // páginas de plantilla — una página de plantilla puede desbordar
      // a varias hojas) lo completa htmlToPdf() en un segundo paso,
      // después de que Chromium ya diseñó el documento y se puede medir
      // cuánto mide cada página de verdad. Acá solo queda el marcador:
      // pageIndex identifica de qué página de plantilla es este
      // elemento, para saber con qué hoja física arranca.
      return `<span style="font-size:12px" data-page-number-for="${pageIndex}"></span>`;
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
): string {
  const justify = zone.direction === "row" ? zoneAlign(zoneKey) : "flex-start";
  const align = zone.direction === "row" ? "center" : zoneAlign(zoneKey);
  return `
    <div style="flex:1;display:flex;flex-direction:${zone.direction};justify-content:${justify};align-items:${align};gap:8px">
      ${zone.elements.map((el) => renderHeaderFooterElement(el, theme, template, pageIndex)).join("")}
    </div>`;
}

function renderBand(
  config: HeaderFooterConfig,
  theme: Template["theme"],
  template: Template,
  pageIndex: number,
): string {
  return `
    <div style="display:flex;align-items:${bandAlign(config.alignV)};gap:16px;min-height:32px">
      ${HEADER_FOOTER_ZONES.map((z) => renderZone(z.value, config[z.value], theme, template, pageIndex)).join("")}
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

// TABLA_ITEMS_PAGINATION_BUG — bug abierto, sin resolver, detectado en
// QA (no inventado/hipotético): cuando una tabla_items se desborda a
// varias hojas físicas, de vez en cuando UNA fila puntual (justo la
// que cae en el borde entre dos hojas) deja de VERSE en el PDF — no es
// que falte en el HTML ni que la salte el layout: confirmé con
// PyMuPDF que el texto de esa fila SIGUE estando en la capa de texto
// del PDF (es seleccionable/extraíble) en una posición Y dentro del
// alto de la hoja, pero Chromium no la pinta — los píxeles de esa fila
// específica simplemente no aparecen al rasterizar esa página.
//
// Reproducido de forma confiable con la plantilla de galería "Oscuro
// con Degradado" + 24 ítems (desborda tabla_items a 2 hojas físicas,
// con encabezado Y pie fijos a la vez). NO reproducido con "Ejecutivo
// Formal" + 24 ítems (mismo volumen de desborde, pero solo pie fijo,
// sin degradado) — ahí las 25 filas se ven todas, sin huecos. Tampoco
// reproduce en un HTML aislado armado a mano replicando la misma
// estructura (flex + padding-top/bottom + bandas fixed + contenido
// genérico) — algo del contenido/combinación real de "Oscuro con
// Degradado" dispara esto, pero no logré aislar exactamente qué.
//
// Lo que SÍ se probó y NO lo resuelve (confirmado quitando/poniendo
// cada uno sobre el documento real, mismo resultado en ambos casos):
//   - tr { break-inside: avoid } (ver la nota en su regla, más abajo)
//   - tfoot { display: table-row-group }
//   - sacar la "máscara" de margen (ya se sacó, por la razón que sea
//     necesaria aparte — no cambia este bug)
//
// No se encontró un fix — esto queda documentado como un bug conocido
// de la combinación tabla_items + encabezado/pie fijos + desborde a
// varias hojas, probablemente un bug de renderizado de Chromium en su
// motor de impresión a PDF (no de este código, que genera el HTML
// correcto — se confirmó que las 25 filas están en el HTML fuente).
// Antes de tocar esto de nuevo: reproducir primero con la plantilla
// "Oscuro con Degradado" + 24-25 ítems, filas de concepto genéricas
// ("Servicio N"), para tener un caso que sí dispara el bug.
function renderItemsTable(
  items: PresupuestoItem[],
  accent: string,
  rowGap: number,
  columnBorders: TablaItemsBordersConfig,
  rules: TablaItemsRulesConfig,
): string {
  const headerRuleColor = escapeAttr(rules.headerRuleColor ?? accent) || "#fff";
  const headerCell = `padding-bottom:8px${rules.headerRule ? `;border-bottom:1px solid ${headerRuleColor}` : ""};${labelStyleAttr}`;
  // rowGap/2 arriba y abajo de cada celda — ver la misma nota en
  // presupuesto-preview.tsx (una tabla no tiene row-gap real).
  const vPad = rowGap / 2;
  // Divisor gris neutro (no currentColor) por defecto a propósito:
  // tiene que verse sutil tanto en tema claro como oscuro, no seguir el
  // color de texto a opacidad completa.
  const rowDividerColor = rules.rowDividerColor ? escapeAttr(rules.rowDividerColor) || "#fff" : "rgba(128,128,128,0.25)";
  const bodyCell = `padding:${vPad}px 8px;font-size:16px;vertical-align:top${rules.rowDivider ? `;border-bottom:1px solid ${rowDividerColor}` : ""}`;
  // Franja de fondo detrás de "Total General" — sin padding asimétrico
  // (que existe para que la fila normal quede pegada a los bordes de
  // la tabla) porque acá el fondo necesita aire alrededor del texto.
  const totalPadLeft = rules.highlightTotal ? "10px 14px" : `${vPad}px 8px 0 0`;
  const totalPadRight = rules.highlightTotal ? "10px 14px" : `${vPad}px 0 0 8px`;
  const totalHighlightAttr = rules.highlightTotal
    ? `;background:color-mix(in srgb, ${escapeAttr(accent) || "#fff"} 15%, transparent);`
    : ";";

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
          <td colspan="3" style="padding:${totalPadLeft};font-size:18px;font-weight:700;text-align:right${totalHighlightAttr}border-radius:8px 0 0 8px">Total General:</td>
          <td style="padding:${totalPadRight};font-size:18px;font-weight:700;text-align:right${totalHighlightAttr}border-radius:0 8px 8px 0">${escapeHtml(formatMoney(grandTotal(items)))}</td>
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
      ? `<div style="${titleStyleAttr(itemsTitleConfig, 13, theme.accent)};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">${escapeHtml(section.title)}</div>`
      : "";
    const itemsRowGap = getRowSpacingConfig(section.config, { rowGap: 24 }).rowGap;
    const itemsBorders = getTablaItemsBorders(section.config);
    const itemsRules = getTablaItemsRules(section.config);
    return `${itemsTitleHtml}${renderItemsTable(items, theme.accent, itemsRowGap, itemsBorders, itemsRules)}`;
  }

  if (section.type === "datos_cliente") {
    const titleConfig = getSectionTitleConfig(section.config);
    const titleHtml = titleConfig.show
      ? `<div style="${titleStyleAttr(titleConfig, 16, theme.accent)};margin-bottom:12px">${escapeHtml(section.title)}</div>`
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
      ? `<div style="${titleStyleAttr(clausulasTitleConfig, 13, theme.accent)};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:20px">${escapeHtml(section.title)}</div>`
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
      ? `<div style="${titleStyleAttr(cierreTitleConfig, 16, theme.accent)};margin-bottom:12px">${escapeHtml(section.title)}</div>`
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
      ? `<div style="${titleStyleAttr(columnsTitleConfig, 13, theme.accent)};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px">${escapeHtml(section.title)}</div>`
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
    ? `<div style="${titleStyleAttr(tableTitleConfig, 13, theme.accent)};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">${escapeHtml(section.title)}</div>`
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
  const fontFamily = FONT_FAMILY[theme.font];

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
    // V_SAFE siempre, más BAND_RESERVE si esta página muestra
    // encabezado/pie — ver la nota grande más abajo sobre por qué este
    // espacio no puede ser padding de .page.
    const topZone = page.show_header ? V_SAFE + BAND_RESERVE : V_SAFE;
    const bottomZone = page.show_footer ? V_SAFE + BAND_RESERVE : V_SAFE;

    const body = `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:${bodyJustify(page.body_align_v)};align-items:${bodyAlignItems(page.body_align_h)};text-align:${bodyTextAlign(page.body_align_h)};padding-top:${topZone}px;padding-bottom:${bottomZone}px">
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
      <div class="page" data-page-index="${pageIndex}" style="color:${escapeAttr(theme.textColor) || "#fff"};font-family:${fontFamily};display:flex;flex-direction:column">
        ${renderPageBackgroundLayer(pageBg, theme.backgroundImage)}
        ${page.show_header ? renderFixedBand(template.header, theme, template, pageIndex, "top") : ""}
        ${page.show_footer ? renderFixedBand(template.footer, theme, template, pageIndex, "bottom") : ""}
        ${body}
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
  @page { size: ${PAGE_WIDTH}px ${PAGE_HEIGHT}px; margin: 0; }
  html, body { width: ${PAGE_WIDTH}px; }
  .page {
    position: relative;
    z-index: 0;
    width: ${PAGE_WIDTH}px;
    min-height: ${PAGE_HEIGHT}px;
    padding: 0 ${H_PAD}px;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  /* El fondo (color/degradado + imagen) de una página ya NO es un
     padding/background propio de .page, ni arriba/abajo son padding
     tampoco — ver la nota grande en renderPresupuestoPdfHtml sobre por
     qué: en resumen, cuando una sección desborda a una hoja física
     extra, el padding/background que vive directo en el elemento que
     se fragmenta (.page) solo se aplica en su primer/último fragmento,
     no en cada hoja física — lo probé directo con box-decoration-break
     (que en teoría es justo para esto) y tampoco lo resuelve en el
     motor de impresión de Chromium.
     .page-bg es la solución: una capa position:fixed del tamaño exacto
     de la hoja, puesta DENTRO de cada .page (no una sola vez en
     <body>, porque cada página puede alternar su propio color/
     degradado vía alternatePageTheme) — position:fixed hace que cada
     hoja física sea su propio contenedor en media paginado, así que
     esta capa se repite completa en cada una, incluida cualquier hoja
     de desborde, sin importar cuánto contenido real haya en ella. */
  .page-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: ${PAGE_WIDTH}px;
    height: ${PAGE_HEIGHT}px;
    z-index: -1;
  }
  /* Por default, un <tfoot> (el "Total General" de tabla_items) se
     repite en CADA hoja impresa en la que la tabla aparece — útil para
     un subtotal corrido, no acá, donde es un total único que tiene que
     salir solo al final de verdad. display:table-row-group lo trata
     como una fila más (misma semántica de columnas), sin el repetido
     automático. */
  tfoot { display: table-row-group; }
  /* Evita que Chromium parta una fila de tabla a la mitad entre dos
     hojas (una fila cortada se vería fea, con su mitad de arriba en
     una hoja y la de abajo en la siguiente) — buena práctica general
     en tablas paginadas. OJO: esto NO resuelve el bug de abajo
     (TABLA_ITEMS_PAGINATION_BUG) — lo probé explícitamente quitando y
     poniendo esta regla sobre el mismo documento real y el bug seguía
     idéntico en ambos casos. Se deja puesta solo porque es correcta
     por su cuenta, no como intento de fix. */
  tr { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body>
  ${pagesHtml.join("\n")}
</body>
</html>`;
}
