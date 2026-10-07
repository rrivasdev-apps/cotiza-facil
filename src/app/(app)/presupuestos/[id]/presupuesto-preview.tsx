"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
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
  HEADER_FOOTER_ZONES,
  PRESUPUESTO_STATUS_LABELS,
} from "@/lib/types";
import type {
  AlignH,
  AlignV,
  BackgroundImageConfig,
  ColumnBorders,
  DatosClienteFields,
  FieldCatalogEntry,
  FieldStyle,
  HeaderFooterConfig,
  HeaderFooterElement,
  HeaderFooterZone,
  HeaderFooterZoneKey,
  MastheadStyle,
  PageWithSections,
  Presupuesto,
  PresupuestoItem,
  SectionWithFields,
  TablaItemsBordersConfig,
  Template,
  ThemeFont,
} from "@/lib/types";
import { renderCompositeTemplate } from "@/lib/composite-template";
import { collectSectionTotalFields, formatMoney, formatQuantity, grandTotal, lineTotal } from "@/lib/presupuesto-items";
import { buildClientFieldsSeed, CLIENT_PSEUDO_FIELDS } from "@/lib/client-fields";
import { buildSocialUrl, SOCIAL_ICON_PATHS } from "@/lib/social-icons";
import { backgroundImageFitStyle } from "@/lib/background-image";

const PAGE_WIDTH = 816;

const FONT_VARS: Record<ThemeFont, string> = {
  manrope: "var(--font-manrope)",
  inter: "var(--font-inter)",
  "jetbrains-mono": "var(--font-jetbrains-mono)",
};

// Fondo sólido de respaldo si por algún motivo theme.bgColor no
// llegara seteado (no debería pasar — DEFAULT_THEME siempre lo trae).
const FALLBACK_BG = "#050505";

// swapped invierte inicio/fin del degradado — se usa en páginas pares
// cuando theme.alternatePageTheme está activo (ver Page más abajo).
// Ver la nota gemela en render-document.ts para el porqué de
// firstStop/secondStop.
function pageBackground(theme: Template["theme"], swapped = false): string {
  if (theme.gradientFrom && theme.gradientTo) {
    const angle = GRADIENT_ANGLES[theme.gradientDirection];
    const rawStop = Math.min(100, Math.max(0, theme.gradientStop ?? 0));
    const from = swapped ? theme.gradientTo : theme.gradientFrom;
    const to = swapped ? theme.gradientFrom : theme.gradientTo;
    const firstStop = swapped ? 0 : rawStop;
    const secondStop = swapped ? 100 - rawStop : 100;
    return `linear-gradient(${angle}deg, ${from} ${firstStop}%, ${to} ${secondStop}%)`;
  }
  return theme.bgColor || FALLBACK_BG;
}

// "left" mapea a "stretch" (no "flex-start") a propósito: el contenido
// de una sección está pensado para ocupar el ancho completo de la
// página — centrar o alinear a la derecha lo angosta a su contenido.
function bodyAlignItems(h: AlignH): React.CSSProperties["alignItems"] {
  return h === "center" ? "center" : h === "right" ? "flex-end" : "stretch";
}

function bodyJustify(v: AlignV): React.CSSProperties["justifyContent"] {
  return v === "center" ? "center" : v === "bottom" ? "flex-end" : "flex-start";
}

function bandAlign(v: AlignV): React.CSSProperties["alignItems"] {
  return v === "center" ? "center" : v === "bottom" ? "flex-end" : "flex-start";
}

// Override de estilo por campo (label_style/value_style) — los campos
// en null/false heredan el font-family de la hoja y el font-size por
// defecto de cada tipo de sección (ambos heredables por CSS).
// textColor es el color de tinta del tema — el contorno (outline) lo
// usa como color del trazo, ya que el relleno va transparente.
function fieldStyle(style: FieldStyle, textColor: string, accent: string): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (style.fontFamily) css.fontFamily = FONT_VARS[style.fontFamily];
  if (style.fontSize) css.fontSize = style.fontSize;
  if (style.bold) css.fontWeight = 700;
  if (style.italic) css.fontStyle = "italic";
  if (style.underline) css.textDecoration = "underline";
  if (style.align) css.textAlign = style.align;
  if (style.outline) {
    css.color = "transparent";
    // Propiedad no estándar pero universalmente soportada (WebKit/Blink/Gecko);
    // no hay equivalente en el tipo CSSProperties de React, de ahí el cast.
    (css as Record<string, string>).WebkitTextStroke = `0.9px ${textColor}`;
  }
  // Línea por lado — el diseñador de bordes es la única fuente de estas
  // líneas (no hay bordes fijos aparte). Color: el que haya elegido el
  // usuario, o el acento del tema por defecto.
  const borderColor = style.borderColor ?? accent;
  if (style.borderTop) css.borderTop = `1px solid ${borderColor}`;
  if (style.borderBottom) css.borderBottom = `1px solid ${borderColor}`;
  if (style.borderLeft) css.borderLeft = `1px solid ${borderColor}`;
  if (style.borderRight) css.borderRight = `1px solid ${borderColor}`;
  return css;
}

// Mismo mecanismo que los 4 ifs de fieldStyle() de arriba, pero para
// ColumnBorders (tabla_items) — ver la nota en TablaItemsBordersConfig
// sobre por qué tabla_items no puede reusar FieldStyle/fieldStyle().
function columnBorderStyle(borders: ColumnBorders, accent: string): React.CSSProperties {
  const css: React.CSSProperties = {};
  const borderColor = borders.borderColor ?? accent;
  if (borders.borderTop) css.borderTop = `1px solid ${borderColor}`;
  if (borders.borderBottom) css.borderBottom = `1px solid ${borderColor}`;
  if (borders.borderLeft) css.borderLeft = `1px solid ${borderColor}`;
  if (borders.borderRight) css.borderRight = `1px solid ${borderColor}`;
  return css;
}

// tabla_datos alinea etiqueta/valor por baseline (ver más abajo) para
// que el texto se vea prolijo cuando ninguno de los dos tiene borde —
// pero si alguno tiene un borde, baseline alinea los textos, no las
// cajas: una etiqueta de dos líneas y un valor de una línea quedan con
// los bordes a distinta altura. Con cualquier borde presente, se
// alinea por el borde superior de la fila en cambio.
function hasAnyBorder(style: FieldStyle): boolean {
  return style.borderTop || style.borderBottom || style.borderLeft || style.borderRight;
}

// Para outlineSplit: el contenedor ya trae color/tamaño/negrita de
// fieldStyle() (heredan por CSS) — acá solo se decide si hay que
// envolver la parte antes de la "/" en su propio span con el
// contorno, dejando el resto como texto plano que hereda del padre.
function renderTitleContent(text: string, outlineSplit: boolean, textColor: string): React.ReactNode {
  if (outlineSplit) {
    const idx = text.indexOf("/");
    if (idx !== -1) {
      return (
        <>
          <span style={{ color: "transparent", WebkitTextStroke: `0.9px ${textColor}` } as React.CSSProperties}>
            {text.slice(0, idx)}
          </span>
          {text.slice(idx)}
        </>
      );
    }
  }
  return text;
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

function formatValue(raw: string | string[] | undefined, dataType: string): React.ReactNode {
  if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
    return <span style={{ opacity: 0.35 }}>—</span>;
  }

  if (dataType === "lista" && Array.isArray(raw)) {
    return (
      <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
        {raw.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  const value = Array.isArray(raw) ? raw.join(", ") : raw;

  if (dataType === "moneda") {
    const num = Number(value);
    return Number.isFinite(num) ? `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : value;
  }

  if (dataType === "fecha" && value) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-AR");
  }

  if (dataType === "texto_largo") {
    return <span style={{ whiteSpace: "pre-wrap" }}>{value}</span>;
  }

  return value;
}

function Rule({ accent, spacing = "16px 0 18px" }: { accent: string; spacing?: string }) {
  return <div style={{ height: 4, background: accent, margin: spacing }} />;
}

// position:absolute + zIndex:-1 (no 0) a propósito: así queda detrás
// del contenido en flujo normal sin importar el orden del DOM — el
// padre (Page) ya tiene position:relative para que este z-index
// negativo se resuelva contra él, no contra la página entera.
function BackgroundImageLayer({ config }: { config: BackgroundImageConfig }) {
  if (!config.imagePath) return null;
  const fit = backgroundImageFitStyle(config.fit);
  const opacity = Math.min(100, Math.max(0, config.opacity)) / 100;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        backgroundImage: `url(${config.imagePath})`,
        ...fit,
        opacity,
      }}
    />
  );
}

function Masthead({ clientName, style, textColor }: { clientName: string; style: MastheadStyle; textColor: string }) {
  return (
    <div
      style={{
        fontSize: style.fontSize ?? 28,
        fontWeight: style.bold ? 700 : 400,
        letterSpacing: "0.01em",
        textAlign: style.align,
      }}
    >
      <span style={{ color: "transparent", WebkitTextStroke: `0.9px ${textColor}` }}>PRESUPUESTO</span>{" "}
      <span style={{ textTransform: "uppercase" }}>{clientName}</span>
    </div>
  );
}

function Logo({ logoPath, fallbackName, size = 64 }: { logoPath?: string | null; fallbackName: string; size?: number }) {
  if (logoPath) {
    // max-height/max-width + width/height:auto (no dimensión fija) a
    // propósito: si la sección queda angosta, el logo se achica para
    // entrar sin deformarse — ver la misma nota en render-document.ts.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoPath} alt="Logo" style={{ maxHeight: size, maxWidth: "100%", width: "auto", height: "auto" }} />;
  }
  const parts = fallbackName.trim().split(/\s+/);
  const [a, ...rest] = parts;
  const b = rest.join(" ");
  const fontSize = Math.round(size * 0.62);
  return (
    <div style={{ display: "inline-flex", alignItems: "stretch" }}>
      <span style={{ fontSize, padding: "8px 11px", background: "#fff", color: "#000" }}>{a}</span>
      {b && (
        <span
          style={{
            fontSize,
            padding: "8px 11px",
            background: "#000",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {b}
        </span>
      )}
    </div>
  );
}

function zoneAlign(zoneKey: HeaderFooterZoneKey): React.CSSProperties["alignItems"] {
  return zoneKey === "center" ? "center" : zoneKey === "right" ? "flex-end" : "flex-start";
}

function HeaderFooterZoneView({
  zoneKey,
  zone,
  theme,
  templateName,
  pageIndex,
  totalPages,
}: {
  zoneKey: HeaderFooterZoneKey;
  zone: HeaderFooterZone;
  theme: Template["theme"];
  templateName: string;
  pageIndex: number;
  totalPages: number;
}) {
  const justify = zone.direction === "row" ? zoneAlign(zoneKey) : "flex-start";
  const align = zone.direction === "row" ? "center" : zoneAlign(zoneKey);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: zone.direction, justifyContent: justify, alignItems: align, gap: 8 }}>
      {zone.elements.map((el, i) => (
        <HeaderFooterElementView
          key={i}
          element={el}
          theme={theme}
          templateName={templateName}
          pageIndex={pageIndex}
          totalPages={totalPages}
        />
      ))}
    </div>
  );
}

function HeaderFooterBand({
  config,
  theme,
  templateName,
  pageIndex,
  totalPages,
}: {
  config: HeaderFooterConfig;
  theme: Template["theme"];
  templateName: string;
  pageIndex: number;
  totalPages: number;
}) {
  const isEmpty = HEADER_FOOTER_ZONES.every((z) => config[z.value].elements.length === 0);
  if (isEmpty) return null;

  return (
    <div style={{ display: "flex", alignItems: bandAlign(config.alignV), gap: 16, minHeight: 32 }}>
      {HEADER_FOOTER_ZONES.map((z) => (
        <HeaderFooterZoneView
          key={z.value}
          zoneKey={z.value}
          zone={config[z.value]}
          theme={theme}
          templateName={templateName}
          pageIndex={pageIndex}
          totalPages={totalPages}
        />
      ))}
    </div>
  );
}

function HeaderFooterElementView({
  element,
  theme,
  templateName,
  pageIndex,
  totalPages,
}: {
  element: HeaderFooterElement;
  theme: Template["theme"];
  templateName: string;
  pageIndex: number;
  totalPages: number;
}) {
  if (element.type === "logo") return <Logo logoPath={theme.logoPath} fallbackName={templateName} size={32} />;
  if (element.type === "page_number") {
    return (
      <span style={{ fontSize: 12 }}>
        Página {pageIndex + 1} de {totalPages}
      </span>
    );
  }
  if (element.type === "social") {
    const url = buildSocialUrl(element.network, element.handle);
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", fontSize: 12, textDecoration: "none" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d={SOCIAL_ICON_PATHS[element.network]} />
        </svg>
        <span>{element.handle}</span>
      </a>
    );
  }
  return <span style={{ fontSize: 12 }}>{element.text}</span>;
}

function CompositeLine({
  sf,
  data,
  fieldsById,
}: {
  sf: SectionWithFields["fields"][number];
  data: Presupuesto["data"];
  fieldsById: Map<string, FieldCatalogEntry>;
}) {
  return <>{renderCompositeTemplate(sf.composite_template ?? "", data, fieldsById)}</>;
}

function ItemsTable({
  items,
  accent,
  rowGap,
  columnBorders,
}: {
  items: PresupuestoItem[];
  accent: string;
  rowGap: number;
  columnBorders: TablaItemsBordersConfig;
}) {
  const headerCellStyle: React.CSSProperties = { ...labelStyle, textAlign: "left", paddingBottom: 8, borderBottom: `1px solid ${accent}` };
  // rowGap/2 arriba y abajo de cada celda — una tabla no tiene
  // row-gap real, así que el espacio visible entre una fila y la
  // siguiente es la suma del padding-bottom de una con el
  // padding-top de la que sigue.
  const vPad = rowGap / 2;
  // Divisor gris neutro (no el color de texto del tema) a propósito:
  // tiene que verse sutil tanto en tema claro como oscuro.
  const bodyCellStyle: React.CSSProperties = {
    padding: `${vPad}px 8px`,
    fontSize: 16,
    verticalAlign: "top",
    borderBottom: "1px solid rgba(128,128,128,0.25)",
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ ...headerCellStyle, ...columnBorderStyle(columnBorders.cantidad, accent) }}>Cant.</th>
          <th style={{ ...headerCellStyle, ...columnBorderStyle(columnBorders.concepto, accent) }}>Concepto</th>
          <th style={{ ...headerCellStyle, textAlign: "right", ...columnBorderStyle(columnBorders.precioUnitario, accent) }}>
            Precio Unit.
          </th>
          <th style={{ ...headerCellStyle, textAlign: "right", ...columnBorderStyle(columnBorders.precioTotal, accent) }}>
            Precio Total
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td style={{ ...bodyCellStyle, ...columnBorderStyle(columnBorders.cantidad, accent) }}>{formatQuantity(item.cantidad)}</td>
            <td style={{ ...bodyCellStyle, whiteSpace: "pre-wrap", ...columnBorderStyle(columnBorders.concepto, accent) }}>
              {item.concepto}
            </td>
            <td style={{ ...bodyCellStyle, textAlign: "right", ...columnBorderStyle(columnBorders.precioUnitario, accent) }}>
              {formatMoney(Number(item.precioUnitario) || 0)}
            </td>
            <td style={{ ...bodyCellStyle, textAlign: "right", ...columnBorderStyle(columnBorders.precioTotal, accent) }}>
              {formatMoney(lineTotal(item))}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} style={{ padding: `${vPad}px 8px 0 0`, fontSize: 18, fontWeight: 700, textAlign: "right" }}>
            Total General:
          </td>
          <td style={{ padding: `${vPad}px 0 0 8px`, fontSize: 18, fontWeight: 700, textAlign: "right" }}>
            {formatMoney(grandTotal(items))}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function DatosCliente({
  clientName,
  clientEmail,
  clientPhone,
  clientAddress,
  fields,
  createdAt,
  number,
  accent,
}: {
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientAddress: string | null;
  fields: DatosClienteFields;
  createdAt: string;
  number: number | null;
  accent: string;
}) {
  const fecha = new Date(createdAt);
  // timeZone explícito a propósito: created_at es un timestamptz real
  // (a diferencia de un campo "fecha" suelto, que se arma/formatea
  // siempre con la hora local del mismo runtime, sin este problema).
  // Sin esto, el server (corre en UTC) y el navegador del cliente
  // (hora de Venezuela) pueden calcular un día de calendario distinto
  // para el mismo instante — eso es lo que generaba el mismatch de
  // hidratación (texto SSR vs. cliente no coincide).
  const fechaLabel = Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-AR", { timeZone: "America/Caracas" });
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontSize: 16 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ border: `1px solid ${accent}`, borderRadius: 8, padding: "16px 20px", width: "100%" }}>
      {row("Cliente", clientName)}
      {fields.showEmail && clientEmail && row("Correo", clientEmail)}
      {fields.showPhone && clientPhone && row("Teléfono", clientPhone)}
      {fields.showAddress && clientAddress && row("Dirección", clientAddress)}
      {row("Fecha", fechaLabel)}
      {number !== null && row("N° Presupuesto", String(number).padStart(4, "0"))}
    </div>
  );
}

function Section({
  section,
  data,
  theme,
  templateName,
  clientName,
  clientEmail,
  clientPhone,
  clientAddress,
  fieldsById,
  items,
  createdAt,
  number,
}: {
  section: SectionWithFields;
  data: Presupuesto["data"];
  theme: Template["theme"];
  templateName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientAddress: string | null;
  fieldsById: Map<string, FieldCatalogEntry>;
  items: PresupuestoItem[];
  createdAt: string;
  number: number | null;
}) {
  const visibleFields = section.fields.filter((sf) => sf.visible);
  const textColor = theme.textColor;

  if (section.type === "tabla_items") {
    // show:true por defecto — ver la misma nota en render-document.ts.
    const itemsTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, show: true });
    return (
      <div style={{ width: "100%" }}>
        {itemsTitleConfig.show && (
          <div
            style={{
              ...labelStyle,
              marginBottom: 8,
              fontFamily: itemsTitleConfig.fontFamily ? FONT_VARS[itemsTitleConfig.fontFamily] : undefined,
              fontSize: itemsTitleConfig.fontSize ?? labelStyle.fontSize,
              fontWeight: itemsTitleConfig.bold ? 700 : undefined,
              fontStyle: itemsTitleConfig.italic ? "italic" : undefined,
              textDecoration: itemsTitleConfig.underline ? "underline" : undefined,
              textAlign: itemsTitleConfig.align,
            }}
          >
            {section.title}
          </div>
        )}
        <ItemsTable
          items={items}
          accent={theme.accent}
          rowGap={getRowSpacingConfig(section.config, { rowGap: 24 }).rowGap}
          columnBorders={getTablaItemsBorders(section.config)}
        />
      </div>
    );
  }

  if (section.type === "datos_cliente") {
    const titleConfig = getSectionTitleConfig(section.config);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        {titleConfig.show && (
          <div
            style={{
              fontFamily: titleConfig.fontFamily ? FONT_VARS[titleConfig.fontFamily] : undefined,
              fontSize: titleConfig.fontSize ?? 16,
              fontWeight: titleConfig.bold ? 700 : 400,
              fontStyle: titleConfig.italic ? "italic" : undefined,
              textDecoration: titleConfig.underline ? "underline" : undefined,
              textAlign: titleConfig.align,
            }}
          >
            {section.title}
          </div>
        )}
        <DatosCliente
          clientName={clientName}
          clientEmail={clientEmail}
          clientPhone={clientPhone}
          clientAddress={clientAddress}
          fields={getDatosClienteFields(section.config)}
          createdAt={createdAt}
          number={number}
          accent={theme.accent}
        />
      </div>
    );
  }

  if (section.type === "portada") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo logoPath={theme.logoPath} fallbackName={templateName} size={140} />
        </div>
        <Rule accent={theme.accent} />
        <Masthead clientName={clientName} style={getMastheadStyle(section.config)} textColor={textColor} />
      </div>
    );
  }

  if (section.type === "clausulas") {
    const clausulasTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, show: true });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        {clausulasTitleConfig.show && (
          <div
            style={{
              ...labelStyle,
              fontFamily: clausulasTitleConfig.fontFamily ? FONT_VARS[clausulasTitleConfig.fontFamily] : undefined,
              fontSize: clausulasTitleConfig.fontSize ?? labelStyle.fontSize,
              fontWeight: clausulasTitleConfig.bold ? 700 : undefined,
              fontStyle: clausulasTitleConfig.italic ? "italic" : undefined,
              textDecoration: clausulasTitleConfig.underline ? "underline" : undefined,
              textAlign: clausulasTitleConfig.align,
            }}
          >
            {section.title}
          </div>
        )}
        {visibleFields.map((sf) => (
          // color (no opacity) a propósito: opacity afectaría también al
          // <b> de abajo, que debe quedar a tinta completa — color sí se
          // puede pisar por elemento.
          <p
            key={sf.id}
            style={{ color: `color-mix(in srgb, ${textColor} 82%, transparent)`, fontSize: 16, lineHeight: 1.6, margin: 0, ...fieldStyle(sf.value_style, textColor, theme.accent) }}
          >
            {sf.field ? (
              <>
                <b style={{ color: textColor, ...fieldStyle(sf.label_style, textColor, theme.accent) }}>{sf.field.name}: </b>
                {formatValue(data[sf.field_catalog_id as string], sf.field.data_type)}
              </>
            ) : (
              <CompositeLine sf={sf} data={data} fieldsById={fieldsById} />
            )}
          </p>
        ))}
      </div>
    );
  }

  if (section.type === "cierre") {
    const cierreTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, align: "center" });
    return (
      <div style={{ textAlign: "center" }}>
        {cierreTitleConfig.show && (
          <div
            style={{
              marginBottom: 12,
              fontFamily: cierreTitleConfig.fontFamily ? FONT_VARS[cierreTitleConfig.fontFamily] : undefined,
              fontSize: cierreTitleConfig.fontSize ?? 16,
              fontWeight: cierreTitleConfig.bold ? 700 : 400,
              fontStyle: cierreTitleConfig.italic ? "italic" : undefined,
              textDecoration: cierreTitleConfig.underline ? "underline" : undefined,
              textAlign: cierreTitleConfig.align,
            }}
          >
            {section.title}
          </div>
        )}
        {visibleFields.map((sf) => (
          <div key={sf.id} style={{ fontSize: 20, lineHeight: 1.4, ...fieldStyle(sf.value_style, textColor, theme.accent) }}>
            {sf.field ? (
              formatValue(data[sf.field_catalog_id as string], sf.field.data_type)
            ) : (
              <CompositeLine sf={sf} data={data} fieldsById={fieldsById} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === "titulo") {
    const tituloConfig = getTituloConfig(section.config);
    const rule = <div style={{ height: 3, background: theme.accent, width: "100%" }} />;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        {tituloConfig.rules && rule}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", textAlign: "center" }}>
          {visibleFields.map((sf) => {
            const isTextField = sf.field && (sf.field.data_type === "texto_corto" || sf.field.data_type === "texto_largo");
            const plainText = !sf.field
              ? renderCompositeTemplate(sf.composite_template ?? "", data, fieldsById)
              : isTextField
                ? String(data[sf.field_catalog_id as string] ?? "")
                : null;
            return (
              <div
                key={sf.id}
                style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, letterSpacing: "0.01em", ...fieldStyle(sf.value_style, textColor, theme.accent) }}
              >
                {plainText !== null
                  ? renderTitleContent(plainText, sf.value_style.outlineSplit, textColor)
                  : sf.field
                    ? formatValue(data[sf.field_catalog_id as string], sf.field.data_type)
                    : null}
              </div>
            );
          })}
        </div>
        {tituloConfig.rules && rule}
      </div>
    );
  }

  if (section.type === "dos_columnas") {
    const cols = getColumnsConfig(section.config);
    const columnsTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, show: true });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        {columnsTitleConfig.show && (
          <div
            style={{
              ...labelStyle,
              fontFamily: columnsTitleConfig.fontFamily ? FONT_VARS[columnsTitleConfig.fontFamily] : undefined,
              fontSize: columnsTitleConfig.fontSize ?? labelStyle.fontSize,
              fontWeight: columnsTitleConfig.bold ? 700 : undefined,
              fontStyle: columnsTitleConfig.italic ? "italic" : undefined,
              textDecoration: columnsTitleConfig.underline ? "underline" : undefined,
              textAlign: columnsTitleConfig.align,
            }}
          >
            {section.title}
          </div>
        )}
        {visibleFields.map((sf) =>
          sf.field ? (
            <div key={sf.id} style={{ display: "flex", width: "100%", gap: 24 }}>
              <div
                style={{ flex: `0 0 ${cols.leftPercent}%`, ...labelStyle, fontSize: 14, ...fieldStyle(sf.label_style, textColor, theme.accent) }}
              >
                {sf.field.name}
              </div>
              <div
                style={{
                  flex: `0 0 ${100 - cols.leftPercent}%`,
                  fontSize: 15,
                  lineHeight: 1.5,
                  ...fieldStyle(sf.value_style, textColor, theme.accent),
                }}
              >
                {formatValue(data[sf.field_catalog_id as string], sf.field.data_type)}
              </div>
            </div>
          ) : (
            <div
              key={sf.id}
              style={{ fontSize: 15, lineHeight: 1.5, width: "100%", ...fieldStyle(sf.value_style, textColor, theme.accent) }}
            >
              <CompositeLine sf={sf} data={data} fieldsById={fieldsById} />
            </div>
          ),
        )}
      </div>
    );
  }

  if (section.type === "texto_libre" || section.type === "lista_items") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        {!getHideTitle(section.config) && <div style={labelStyle}>{section.title}</div>}
        {visibleFields.map((sf) => (
          <div key={sf.id}>
            {sf.field && (
              <div style={{ ...labelStyle, marginBottom: 8, ...fieldStyle(sf.label_style, textColor, theme.accent) }}>{sf.field.name}</div>
            )}
            <div style={{ fontSize: 18, lineHeight: 1.5, ...fieldStyle(sf.value_style, textColor, theme.accent) }}>
              {sf.field ? (
                formatValue(data[sf.field_catalog_id as string], sf.field.data_type)
              ) : (
                <CompositeLine sf={sf} data={data} fieldsById={fieldsById} />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // tabla_datos (y cualquier otro tipo genérico): filas grandes clave/valor
  const tableTitleConfig = getSectionTitleConfig(section.config, { ...DEFAULT_SECTION_TITLE, show: true });
  const rowGap = getRowSpacingConfig(section.config).rowGap;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {tableTitleConfig.show && (
        <div
          style={{
            ...labelStyle,
            marginBottom: 8,
            fontFamily: tableTitleConfig.fontFamily ? FONT_VARS[tableTitleConfig.fontFamily] : undefined,
            fontSize: tableTitleConfig.fontSize ?? labelStyle.fontSize,
            fontWeight: tableTitleConfig.bold ? 700 : undefined,
            fontStyle: tableTitleConfig.italic ? "italic" : undefined,
            textDecoration: tableTitleConfig.underline ? "underline" : undefined,
            textAlign: tableTitleConfig.align,
          }}
        >
          {section.title}
        </div>
      )}
      {visibleFields.map((sf) =>
        sf.field ? (
          <div
            key={sf.id}
            style={{
              display: "flex",
              alignItems: hasAnyBorder(sf.label_style) || hasAnyBorder(sf.value_style) ? "flex-start" : "baseline",
              gap: 12,
              marginBottom: rowGap,
            }}
          >
            <div style={{ ...labelStyle, flex: "0 0 160px", ...fieldStyle(sf.label_style, textColor, theme.accent) }}>{sf.field.name}:</div>
            <div
              style={{
                flex: 1,
                fontSize: 20,
                paddingBottom: 8,
                ...fieldStyle(sf.value_style, textColor, theme.accent),
              }}
            >
              {formatValue(data[sf.field_catalog_id as string], sf.field.data_type)}
            </div>
          </div>
        ) : (
          <div key={sf.id} style={{ marginBottom: rowGap, width: "100%" }}>
            <div style={{ fontSize: 20, ...fieldStyle(sf.value_style, textColor, theme.accent) }}>
              <CompositeLine sf={sf} data={data} fieldsById={fieldsById} />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function Page({
  page,
  pageIndex,
  totalPages,
  presupuesto,
  data,
  template,
  fieldsById,
}: {
  page: PageWithSections;
  pageIndex: number;
  totalPages: number;
  presupuesto: Presupuesto;
  data: Presupuesto["data"];
  template: Template;
  fieldsById: Map<string, FieldCatalogEntry>;
}) {
  const { theme } = template;
  const isEvenPage = pageIndex % 2 === 1;

  return (
    <div
      style={{
        position: "relative",
        zIndex: 0,
        width: PAGE_WIDTH,
        minHeight: 1056,
        borderRadius: 4,
        padding: "57px 78px",
        background: pageBackground(theme, theme.alternatePageTheme && isEvenPage),
        color: theme.textColor,
        fontFamily: FONT_VARS[theme.font],
        boxShadow: "0 30px 60px -20px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <BackgroundImageLayer config={theme.backgroundImage} />
      {page.show_header && (
        <HeaderFooterBand
          config={template.header}
          theme={theme}
          templateName={template.name}
          pageIndex={pageIndex}
          totalPages={totalPages}
        />
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: bodyJustify(page.body_align_v),
          alignItems: bodyAlignItems(page.body_align_h),
          textAlign: page.body_align_h,
        }}
      >
        {page.sections.map((section) => {
          const m = getSectionMargins(section.config);
          return (
            <div key={section.id} style={{ padding: `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px` }}>
              <Section
                section={section}
                data={data}
                theme={theme}
                templateName={template.name}
                clientName={presupuesto.client_name}
                clientEmail={presupuesto.client_email}
                clientPhone={presupuesto.client_phone}
                clientAddress={presupuesto.client_address}
                fieldsById={fieldsById}
                items={presupuesto.items[section.id] ?? []}
                createdAt={presupuesto.created_at}
                number={presupuesto.number}
              />
            </div>
          );
        })}
      </div>

      {page.show_footer && (
        <HeaderFooterBand
          config={template.footer}
          theme={theme}
          templateName={template.name}
          pageIndex={pageIndex}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}

// La hoja se dibuja siempre a su tamaño real (816px, mismas fuentes y
// paddings que el PDF) y después se achica entera con un transform —
// nunca se le angosta el ancho para que "entre" en el teléfono, porque
// eso reacomoda el texto (etiquetas partidas en dos líneas, etc.) y
// deja de representar el documento que realmente se manda/imprime.
function ScaledPage({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      setScale(Math.min(1, outer.offsetWidth / PAGE_WIDTH));
      setContentHeight(inner.offsetHeight);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      style={{ width: "100%", maxWidth: PAGE_WIDTH, height: contentHeight ? contentHeight * scale : undefined }}
    >
      <div ref={innerRef} style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

export function PresupuestoPreview({
  presupuesto,
  template,
  pages,
  catalogFields,
  hideBackLink,
}: {
  presupuesto: Presupuesto;
  template: Template;
  pages: PageWithSections[];
  // Todo el catálogo de campos de la cuenta, no solo los usados como
  // campo directo en esta plantilla — una línea combinada puede
  // apuntar a un campo cuyo único uso directo vivía en una página que
  // ya se borró. El valor sigue en presupuesto.data (eso no se toca al
  // editar la plantilla); sin esto, dejaba de poder resolverse.
  catalogFields: FieldCatalogEntry[];
  // La página pública de aprobación (/aprobar/[id]) reusa este mismo
  // componente para el cliente — el link a la lista de presupuestos
  // no le sirve de nada (no tiene sesión) y solo generaría confusión.
  hideBackLink?: boolean;
}) {
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

  const data: Presupuesto["data"] = {
    ...presupuesto.data,
    ...buildClientFieldsSeed(presupuesto.client_name, presupuesto.client_email, presupuesto.client_phone, presupuesto.client_address),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: PAGE_WIDTH }}>
        {hideBackLink ? (
          <span />
        ) : (
          <Link href="/presupuestos" style={{ color: "var(--ink-dim)" }}>
            ← Presupuestos
          </Link>
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            background: "var(--card)",
            boxShadow: "var(--sh-soft)",
            borderRadius: 999,
            padding: "0.3rem 0.75rem",
          }}
        >
          {PRESUPUESTO_STATUS_LABELS[presupuesto.status]}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {pages.map((page, index) => (
          <ScaledPage key={page.id}>
            <Page
              page={page}
              pageIndex={index}
              totalPages={pages.length}
              presupuesto={presupuesto}
              data={data}
              template={template}
              fieldsById={fieldsById}
            />
          </ScaledPage>
        ))}
        {pages.length === 0 && (
          <p style={{ color: "var(--ink-dim)" }}>Esta plantilla no tiene páginas.</p>
        )}
      </div>
    </div>
  );
}
