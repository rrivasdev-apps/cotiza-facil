import Link from "next/link";
import { PRESUPUESTO_STATUS_LABELS } from "@/lib/types";
import type { Presupuesto, SectionWithFields, Template, ThemeFont } from "@/lib/types";

const FONT_VARS: Record<ThemeFont, string> = {
  manrope: "var(--font-manrope)",
  inter: "var(--font-inter)",
  "jetbrains-mono": "var(--font-jetbrains-mono)",
};

function formatValue(raw: string | string[] | undefined, dataType: string): React.ReactNode {
  if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
    return <span style={{ color: "var(--ink-faint)" }}>—</span>;
  }

  if (dataType === "lista" && Array.isArray(raw)) {
    return (
      <ul style={{ paddingLeft: "1.1rem" }}>
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

function Section({ section, data }: { section: SectionWithFields; data: Presupuesto["data"] }) {
  if (section.type === "portada") {
    return (
      <div style={{ textAlign: "center", padding: "1rem 0 1.5rem" }}>
        <div style={{ width: 48, height: 3, background: "var(--accent)", margin: "0 auto 1rem" }} />
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{section.title}</h2>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          textTransform: "uppercase",
          color: "var(--accent)",
          letterSpacing: "0.04em",
        }}
      >
        {section.title}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {section.fields.map((sf) => (
          <div key={sf.id}>
            <div style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>{sf.field.name}</div>
            <div>{formatValue(data[sf.field_catalog_id], sf.field.data_type)}</div>
          </div>
        ))}
      </div>
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
  const hasGradient = theme.gradientFrom && theme.gradientTo;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
          background: "var(--card)",
          borderRadius: 16,
          boxShadow: "var(--sh-soft)",
          overflow: "hidden",
          fontFamily: FONT_VARS[theme.font],
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            background: hasGradient
              ? `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`
              : "var(--bg)",
            color: hasGradient ? "#fff" : "var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{template.name}</div>
            <div style={{ color: hasGradient ? "rgba(255,255,255,0.85)" : "var(--ink-dim)", fontSize: "0.9rem" }}>
              Para {presupuesto.client_name} · {presupuesto.client_email}
            </div>
          </div>
          {theme.logoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoPath} alt="Logo" style={{ height: 44, borderRadius: 6 }} />
          )}
        </div>

        <div style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {sections.map((section) => (
            <Section key={section.id} section={section} data={presupuesto.data} />
          ))}
          {sections.length === 0 && (
            <p style={{ color: "var(--ink-faint)" }}>Esta plantilla no tiene secciones.</p>
          )}
        </div>
      </div>
    </div>
  );
}
