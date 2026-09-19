import Link from "next/link";
import { PRESUPUESTO_STATUS_LABELS } from "@/lib/types";
import type { Presupuesto, SectionWithFields, Template, ThemeFont } from "@/lib/types";

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
    <div style={{ fontSize: 28, letterSpacing: "0.01em" }}>
      <span style={{ color: "transparent", WebkitTextStroke: "0.9px #fff" }}>PRESUPUESTO</span>{" "}
      <span style={{ color: "#fff", textTransform: "uppercase" }}>{clientName}</span>
    </div>
  );
}

function Logo({ logoPath, fallbackName }: { logoPath?: string | null; fallbackName: string }) {
  if (logoPath) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoPath} alt="Logo" style={{ height: 64, width: "auto", maxWidth: "100%" }} />;
  }
  const parts = fallbackName.trim().split(/\s+/);
  const [a, ...rest] = parts;
  const b = rest.join(" ");
  return (
    <div style={{ display: "inline-flex", alignItems: "stretch" }}>
      <span style={{ fontSize: 40, padding: "8px 11px", background: "#fff", color: "#000" }}>{a}</span>
      {b && (
        <span
          style={{
            fontSize: 40,
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

function Section({
  section,
  data,
  accent,
}: {
  section: SectionWithFields;
  data: Presupuesto["data"];
  accent: string;
}) {
  if (section.type === "clausulas") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={labelStyle}>{section.title}</div>
        {section.fields.map((sf) => (
          <p key={sf.id} style={{ color: "rgba(255,255,255,0.82)", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            <b style={{ color: "#fff" }}>{sf.field.name}: </b>
            {formatValue(data[sf.field_catalog_id], sf.field.data_type)}
          </p>
        ))}
      </div>
    );
  }

  if (section.type === "cierre") {
    return (
      <div style={{ textAlign: "center", marginTop: "auto", paddingTop: 22 }}>
        {section.fields.map((sf) => (
          <div key={sf.id} style={{ color: "#fff", fontSize: 20, lineHeight: 1.4 }}>
            {formatValue(data[sf.field_catalog_id], sf.field.data_type)}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === "texto_libre" || section.type === "lista_items") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={labelStyle}>{section.title}</div>
        {section.fields.map((sf) => (
          <div key={sf.id}>
            <div style={{ ...labelStyle, marginBottom: 8 }}>{sf.field.name}</div>
            <div style={{ color: "#fff", fontSize: 18, lineHeight: 1.5 }}>
              {formatValue(data[sf.field_catalog_id], sf.field.data_type)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // tabla_datos (y cualquier otro tipo genérico): filas grandes clave/valor
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>{section.title}</div>
      {section.fields.map((sf) => (
        <div key={sf.id} style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <div style={{ ...labelStyle, flex: "0 0 160px" }}>{sf.field.name}:</div>
          <div
            style={{
              flex: 1,
              color: "#fff",
              fontSize: 20,
              paddingBottom: 8,
              borderBottom: `1px solid ${accent}`,
            }}
          >
            {formatValue(data[sf.field_catalog_id], sf.field.data_type)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PresupuestoPreview({
  presupuesto,
  template,
  sections,
}: {
  presupuesto: Presupuesto;
  template: Template;
  sections: SectionWithFields[];
}) {
  const { theme } = template;
  const portada = sections.find((s) => s.type === "portada");
  const rest = sections.filter((s) => s.type !== "portada");

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
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Logo logoPath={theme.logoPath} fallbackName={template.name} />
          </div>
          <Rule accent={theme.accent} />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Masthead clientName={presupuesto.client_name} />
          </div>
          {portada && portada.title !== "Portada" && (
            <div style={{ ...labelStyle, marginTop: 12 }}>{portada.title}</div>
          )}
        </div>

        <Rule accent={theme.accent} spacing="28px 0" />

        <div style={{ display: "flex", flexDirection: "column", gap: 36, flex: 1 }}>
          {rest.map((section) => (
            <Section key={section.id} section={section} data={presupuesto.data} accent={theme.accent} />
          ))}
          {sections.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.6)" }}>Esta plantilla no tiene secciones.</p>
          )}
        </div>
      </div>
    </div>
  );
}
