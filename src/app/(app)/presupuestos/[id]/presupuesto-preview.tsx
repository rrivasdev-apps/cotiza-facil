import Link from "next/link";
import { PRESUPUESTO_STATUS_LABELS } from "@/lib/types";
import type {
  AlignH,
  AlignV,
  FieldStyle,
  HeaderFooterConfig,
  HeaderFooterElement,
  PageWithSections,
  Presupuesto,
  SectionWithFields,
  Template,
  ThemeFont,
} from "@/lib/types";

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

function pageBackground(theme: Template["theme"]): string {
  if (theme.gradientFrom && theme.gradientTo) {
    return `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`;
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

function Masthead({ clientName }: { clientName: string }) {
  return (
    <div style={{ fontSize: 28, letterSpacing: "0.01em", textAlign: "center" }}>
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

function Section({
  section,
  data,
  theme,
  templateName,
}: {
  section: SectionWithFields;
  data: Presupuesto["data"];
  theme: Template["theme"];
  templateName: string;
}) {
  if (section.type === "portada") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo logoPath={theme.logoPath} fallbackName={templateName} />
        </div>
        <Rule accent={theme.accent} />
      </div>
    );
  }

  if (section.type === "clausulas") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        <div style={labelStyle}>{section.title}</div>
        {section.fields.map((sf) => (
          <p key={sf.id} style={{ color: "rgba(255,255,255,0.82)", fontSize: 16, lineHeight: 1.6, margin: 0, ...fieldStyle(sf.value_style) }}>
            <b style={{ color: "#fff", ...fieldStyle(sf.label_style) }}>{sf.field.name}: </b>
            {formatValue(data[sf.field_catalog_id], sf.field.data_type)}
          </p>
        ))}
      </div>
    );
  }

  if (section.type === "cierre") {
    return (
      <div style={{ textAlign: "center" }}>
        {section.fields.map((sf) => (
          <div key={sf.id} style={{ color: "#fff", fontSize: 20, lineHeight: 1.4, ...fieldStyle(sf.value_style) }}>
            {formatValue(data[sf.field_catalog_id], sf.field.data_type)}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === "texto_libre" || section.type === "lista_items") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div style={labelStyle}>{section.title}</div>
        {section.fields.map((sf) => (
          <div key={sf.id}>
            <div style={{ ...labelStyle, marginBottom: 8, ...fieldStyle(sf.label_style) }}>{sf.field.name}</div>
            <div style={{ color: "#fff", fontSize: 18, lineHeight: 1.5, ...fieldStyle(sf.value_style) }}>
              {formatValue(data[sf.field_catalog_id], sf.field.data_type)}
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
      {section.fields.map((sf) => (
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
            {formatValue(data[sf.field_catalog_id], sf.field.data_type)}
          </div>
        </div>
      ))}
    </div>
  );
}

function Page({
  page,
  pageIndex,
  totalPages,
  presupuesto,
  template,
}: {
  page: PageWithSections;
  pageIndex: number;
  totalPages: number;
  presupuesto: Presupuesto;
  template: Template;
}) {
  const { theme } = template;
  const showMasthead = page.sections.some((s) => s.type === "portada");

  return (
    <div
      style={{
        width: 816,
        maxWidth: "100%",
        minHeight: 1056,
        borderRadius: 4,
        padding: "57px 78px",
        background: pageBackground(theme),
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
          gap: 36,
        }}
      >
        {showMasthead && <Masthead clientName={presupuesto.client_name} />}
        {page.sections.map((section) => (
          <Section key={section.id} section={section} data={presupuesto.data} theme={theme} templateName={template.name} />
        ))}
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

export function PresupuestoPreview({
  presupuesto,
  template,
  pages,
}: {
  presupuesto: Presupuesto;
  template: Template;
  pages: PageWithSections[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 816 }}>
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
          <Page
            key={page.id}
            page={page}
            pageIndex={index}
            totalPages={pages.length}
            presupuesto={presupuesto}
            template={template}
          />
        ))}
        {pages.length === 0 && (
          <p style={{ color: "var(--ink-dim)" }}>Esta plantilla no tiene páginas.</p>
        )}
      </div>
    </div>
  );
}
