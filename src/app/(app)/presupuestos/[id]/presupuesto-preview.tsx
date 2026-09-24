"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getHideTitle,
  getMastheadStyle,
  getSectionMargins,
  getSectionTitleConfig,
  GRADIENT_ANGLES,
  PRESUPUESTO_STATUS_LABELS,
} from "@/lib/types";
import type {
  AlignH,
  AlignV,
  FieldCatalogEntry,
  FieldStyle,
  HeaderFooterConfig,
  HeaderFooterElement,
  MastheadStyle,
  PageWithSections,
  Presupuesto,
  PresupuestoItem,
  SectionWithFields,
  Template,
  ThemeFont,
} from "@/lib/types";
import { renderCompositeTemplate } from "@/lib/composite-template";
import { collectSectionTotalFields, formatMoney, formatQuantity, grandTotal, lineTotal } from "@/lib/presupuesto-items";

const PAGE_WIDTH = 816;

const FONT_VARS: Record<ThemeFont, string> = {
  manrope: "var(--font-manrope)",
  inter: "var(--font-inter)",
  "jetbrains-mono": "var(--font-jetbrains-mono)",
};

// Mismo mecanismo que el artifact original ("Consola de Presupuestos"):
// sin degradado, el fondo de la hoja es un plano casi negro fijo (no el
// acento de la cuenta) — el acento solo pinta reglas y subrayados. Con
// degradado, la hoja entera se pinta con los dos colores elegidos.
const FLAT_PAGE_BG = "#050505";

// swapped invierte inicio/fin del degradado — se usa en páginas pares
// cuando theme.alternatePageTheme está activo (ver Page más abajo).
function pageBackground(theme: Template["theme"], swapped = false): string {
  if (theme.gradientFrom && theme.gradientTo) {
    const angle = GRADIENT_ANGLES[theme.gradientDirection];
    const stop = Math.min(100, Math.max(0, theme.gradientStop ?? 0));
    const from = swapped ? theme.gradientTo : theme.gradientFrom;
    const to = swapped ? theme.gradientFrom : theme.gradientTo;
    return `linear-gradient(${angle}deg, ${from} ${stop}%, ${to} 100%)`;
  }
  return FLAT_PAGE_BG;
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

function bandJustify(h: AlignH): React.CSSProperties["justifyContent"] {
  return h === "center" ? "center" : h === "right" ? "flex-end" : "flex-start";
}

function bandAlign(v: AlignV): React.CSSProperties["alignItems"] {
  return v === "center" ? "center" : v === "bottom" ? "flex-end" : "flex-start";
}

// Override de estilo por campo (label_style/value_style) — los campos
// en null/false heredan el font-family de la hoja y el font-size por
// defecto de cada tipo de sección (ambos heredables por CSS).
function fieldStyle(style: FieldStyle): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (style.fontFamily) css.fontFamily = FONT_VARS[style.fontFamily];
  if (style.fontSize) css.fontSize = style.fontSize;
  if (style.bold) css.fontWeight = 700;
  if (style.italic) css.fontStyle = "italic";
  if (style.underline) css.textDecoration = "underline";
  if (style.align) css.textAlign = style.align;
  return css;
}

const labelStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

function formatValue(raw: string | string[] | undefined, dataType: string): React.ReactNode {
  if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
    return <span style={{ color: "rgba(255,255,255,0.35)" }}>—</span>;
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

function Masthead({ clientName, style }: { clientName: string; style: MastheadStyle }) {
  return (
    <div
      style={{
        fontSize: style.fontSize ?? 28,
        fontWeight: style.bold ? 700 : 400,
        letterSpacing: "0.01em",
        textAlign: style.align,
      }}
    >
      <span style={{ color: "transparent", WebkitTextStroke: "0.9px #fff" }}>PRESUPUESTO</span>{" "}
      <span style={{ color: "#fff", textTransform: "uppercase" }}>{clientName}</span>
    </div>
  );
}

function Logo({ logoPath, fallbackName, size = 64 }: { logoPath?: string | null; fallbackName: string; size?: number }) {
  if (logoPath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoPath} alt="Logo" style={{ height: size, width: "auto", maxWidth: "100%" }} />;
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
  if (config.elements.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: bandJustify(config.alignH),
        alignItems: bandAlign(config.alignV),
        gap: 16,
        minHeight: 32,
      }}
    >
      {config.elements.map((el, i) => (
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
      <span style={{ color: "#fff", fontSize: 12 }}>
        Página {pageIndex + 1} de {totalPages}
      </span>
    );
  }
  return <span style={{ color: "#fff", fontSize: 12 }}>{element.text}</span>;
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

function ItemsTable({ items, accent }: { items: PresupuestoItem[]; accent: string }) {
  const headerCellStyle: React.CSSProperties = { ...labelStyle, textAlign: "left", paddingBottom: 8, borderBottom: `1px solid ${accent}` };
  const bodyCellStyle: React.CSSProperties = {
    padding: "12px 8px",
    color: "#fff",
    fontSize: 16,
    verticalAlign: "top",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={headerCellStyle}>Cant.</th>
          <th style={headerCellStyle}>Concepto</th>
          <th style={{ ...headerCellStyle, textAlign: "right" }}>Precio Unit.</th>
          <th style={{ ...headerCellStyle, textAlign: "right" }}>Precio Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td style={bodyCellStyle}>{formatQuantity(item.cantidad)}</td>
            <td style={{ ...bodyCellStyle, whiteSpace: "pre-wrap" }}>{item.concepto}</td>
            <td style={{ ...bodyCellStyle, textAlign: "right" }}>{formatMoney(Number(item.precioUnitario) || 0)}</td>
            <td style={{ ...bodyCellStyle, textAlign: "right" }}>{formatMoney(lineTotal(item))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3} style={{ padding: "12px 8px 0 0", color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "right" }}>
            Total General:
          </td>
          <td style={{ padding: "12px 0 0 8px", color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "right" }}>
            {formatMoney(grandTotal(items))}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function DatosCliente({
  clientName,
  createdAt,
  number,
  accent,
}: {
  clientName: string;
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
      <span style={{ color: "#fff", fontSize: 16 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ border: `1px solid ${accent}`, borderRadius: 8, padding: "16px 20px", width: "100%" }}>
      {row("Cliente", clientName)}
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
  fieldsById: Map<string, FieldCatalogEntry>;
  items: PresupuestoItem[];
  createdAt: string;
  number: number | null;
}) {
  const visibleFields = section.fields.filter((sf) => sf.visible);

  if (section.type === "tabla_items") {
    return (
      <div style={{ width: "100%" }}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>{section.title}</div>
        <ItemsTable items={items} accent={theme.accent} />
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
              color: "#fff",
              fontSize: titleConfig.fontSize ?? 16,
              fontWeight: titleConfig.bold ? 700 : 400,
              textAlign: titleConfig.align,
            }}
          >
            {section.title}
          </div>
        )}
        <DatosCliente clientName={clientName} createdAt={createdAt} number={number} accent={theme.accent} />
      </div>
    );
  }

  if (section.type === "portada") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo logoPath={theme.logoPath} fallbackName={templateName} />
        </div>
        <Rule accent={theme.accent} />
        <Masthead clientName={clientName} style={getMastheadStyle(section.config)} />
      </div>
    );
  }

  if (section.type === "clausulas") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        <div style={labelStyle}>{section.title}</div>
        {visibleFields.map((sf) => (
          <p key={sf.id} style={{ color: "rgba(255,255,255,0.82)", fontSize: 16, lineHeight: 1.6, margin: 0, ...fieldStyle(sf.value_style) }}>
            {sf.field ? (
              <>
                <b style={{ color: "#fff", ...fieldStyle(sf.label_style) }}>{sf.field.name}: </b>
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
    return (
      <div style={{ textAlign: "center" }}>
        {visibleFields.map((sf) => (
          <div key={sf.id} style={{ color: "#fff", fontSize: 20, lineHeight: 1.4, ...fieldStyle(sf.value_style) }}>
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

  if (section.type === "texto_libre" || section.type === "lista_items") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        {!getHideTitle(section.config) && <div style={labelStyle}>{section.title}</div>}
        {visibleFields.map((sf) => (
          <div key={sf.id}>
            {sf.field && (
              <div style={{ ...labelStyle, marginBottom: 8, ...fieldStyle(sf.label_style) }}>{sf.field.name}</div>
            )}
            <div style={{ color: "#fff", fontSize: 18, lineHeight: 1.5, ...fieldStyle(sf.value_style) }}>
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>{section.title}</div>
      {visibleFields.map((sf) =>
        sf.field ? (
          <div key={sf.id} style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <div style={{ ...labelStyle, flex: "0 0 160px", ...fieldStyle(sf.label_style) }}>{sf.field.name}:</div>
            <div
              style={{
                flex: 1,
                color: "#fff",
                fontSize: 20,
                paddingBottom: 8,
                borderBottom: `1px solid ${theme.accent}`,
                ...fieldStyle(sf.value_style),
              }}
            >
              {formatValue(data[sf.field_catalog_id as string], sf.field.data_type)}
            </div>
          </div>
        ) : (
          <div key={sf.id} style={{ marginBottom: 16, width: "100%" }}>
            <div style={{ color: "#fff", fontSize: 20, ...fieldStyle(sf.value_style) }}>
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
  template,
  fieldsById,
}: {
  page: PageWithSections;
  pageIndex: number;
  totalPages: number;
  presupuesto: Presupuesto;
  template: Template;
  fieldsById: Map<string, FieldCatalogEntry>;
}) {
  const { theme } = template;
  const isEvenPage = pageIndex % 2 === 1;

  return (
    <div
      style={{
        width: PAGE_WIDTH,
        minHeight: 1056,
        borderRadius: 4,
        padding: "57px 78px",
        background: pageBackground(theme, theme.alternatePageTheme && isEvenPage),
        fontFamily: FONT_VARS[theme.font],
        boxShadow: "0 30px 60px -20px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
                data={presupuesto.data}
                theme={theme}
                templateName={template.name}
                clientName={presupuesto.client_name}
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
}: {
  presupuesto: Presupuesto;
  template: Template;
  pages: PageWithSections[];
}) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: PAGE_WIDTH }}>
        <Link href="/presupuestos" style={{ color: "var(--ink-dim)" }}>
          ← Presupuestos
        </Link>
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
