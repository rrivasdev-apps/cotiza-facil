"use client";

import { useActionState, useState } from "react";
import { createPresupuesto } from "@/lib/presupuestos/actions";
import type { DataType, TemplateWithPages } from "@/lib/types";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  borderRadius: 12,
  boxShadow: "var(--sh-soft)",
  padding: "1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  font: "inherit",
  color: "var(--ink)",
  width: "100%",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
};

function labelStyle(): React.CSSProperties {
  return { fontSize: "0.8rem", color: "var(--ink-dim)" };
}

function FieldInput({
  name,
  dataType,
  required,
}: {
  name: string;
  dataType: DataType;
  required: boolean;
}) {
  switch (dataType) {
    case "texto_largo":
      return <textarea name={name} required={required} rows={3} style={inputStyle} />;
    case "lista":
      return (
        <textarea
          name={name}
          required={required}
          rows={3}
          placeholder="Un ítem por línea"
          style={inputStyle}
        />
      );
    case "fecha":
      return <input type="date" name={name} required={required} style={inputStyle} />;
    case "moneda":
      return <input type="number" step="0.01" name={name} required={required} style={inputStyle} />;
    default:
      return <input type="text" name={name} required={required} style={inputStyle} />;
  }
}

export function NewPresupuestoForm({ templates }: { templates: TemplateWithPages[] }) {
  const [templateId, setTemplateId] = useState<string>("");
  const [error, formAction, pending] = useActionState(createPresupuesto, null);

  const template = templates.find((t) => t.id === templateId) ?? null;
  const sections = template?.pages.flatMap((p) => p.sections) ?? [];

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 640 }}
    >
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Nuevo presupuesto</h1>

      <div style={cardStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle()}>Plantilla</span>
          <select
            name="template_id"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            required
            style={inputStyle}
          >
            <option value="" disabled>
              Elegí una plantilla
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {template && (
        <>
          <div style={cardStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle()}>Nombre del cliente</span>
              <input type="text" name="client_name" required style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle()}>Correo del cliente</span>
              <input type="email" name="client_email" required style={inputStyle} />
            </label>
          </div>

          {sections.map((section) => (
            <div key={section.id} style={cardStyle}>
              <span style={{ fontWeight: 600 }}>{section.title}</span>
              {section.fields.length === 0 && (
                <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>
                  Esta sección no tiene campos.
                </p>
              )}
              {section.fields.map((sf) => (
                <label key={sf.id} style={fieldStyle}>
                  <span style={labelStyle()}>
                    {sf.field.name}
                    {sf.required && " *"}
                  </span>
                  <FieldInput
                    name={`field_${sf.field_catalog_id}`}
                    dataType={sf.field.data_type}
                    required={sf.required}
                  />
                </label>
              ))}
            </div>
          ))}

          {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}

          <button
            type="submit"
            disabled={pending}
            style={{
              alignSelf: "flex-start",
              background: "var(--ink)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.6rem 1.25rem",
              font: "inherit",
              fontWeight: 600,
              cursor: pending ? "default" : "pointer",
            }}
          >
            {pending ? "Guardando..." : "Guardar y ver vista previa"}
          </button>
        </>
      )}
    </form>
  );
}
