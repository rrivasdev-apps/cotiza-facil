"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createPresupuesto } from "@/lib/presupuestos/actions";
import { ItemsEditor } from "../items-editor";
import type { DataType, TemplateWithPages } from "@/lib/types";

export const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--sh-soft)",
  padding: "1.35rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

export const inputStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.6rem 0.85rem",
  font: "inherit",
  color: "var(--ink)",
  width: "100%",
};

export const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
};

export function labelStyle(): React.CSSProperties {
  return {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "var(--ink-faint)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
}

export function FieldInput({
  name,
  dataType,
  required,
  defaultValue,
}: {
  name: string;
  dataType: DataType;
  required: boolean;
  defaultValue?: string;
}) {
  switch (dataType) {
    case "texto_largo":
      return <textarea name={name} required={required} rows={3} defaultValue={defaultValue} style={inputStyle} />;
    case "lista":
      return (
        <textarea
          name={name}
          required={required}
          rows={3}
          placeholder="Un ítem por línea"
          defaultValue={defaultValue}
          style={inputStyle}
        />
      );
    case "fecha":
      return <input type="date" name={name} required={required} defaultValue={defaultValue} style={inputStyle} />;
    case "moneda":
      return (
        <input type="number" step="0.01" name={name} required={required} defaultValue={defaultValue} style={inputStyle} />
      );
    default:
      return <input type="text" name={name} required={required} defaultValue={defaultValue} style={inputStyle} />;
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
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}
    >
      <div>
        <p style={{ display: "flex", gap: "0.4rem", fontSize: "0.8125rem", color: "var(--ink-faint)", marginBottom: "0.4rem" }}>
          <Link href="/presupuestos" style={{ color: "var(--ink-dim)", fontWeight: 600 }}>
            Presupuestos
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>Nuevo presupuesto</span>
        </p>
        <h1 style={{ fontSize: "1.5rem" }}>Nuevo presupuesto</h1>
      </div>

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

          {sections.map((section) => {
            if (section.type === "tabla_items") {
              return (
                <div key={section.id} style={cardStyle}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem" }}>
                    {section.title}
                  </span>
                  <ItemsEditor sectionId={section.id} initialItems={[]} />
                </div>
              );
            }

            // Las "líneas combinadas" (sf.field null) no se completan a
            // mano — se calculan solas a partir de otros campos, no
            // aparecen en el formulario de carga.
            const fillableFields = section.fields.filter((sf) => sf.field);
            return (
              <div key={section.id} style={cardStyle}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem" }}>
                  {section.title}
                </span>
                {fillableFields.length === 0 && (
                  <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>
                    Esta sección no tiene campos.
                  </p>
                )}
                {fillableFields.map((sf) => {
                  const computed = sf.number_in_words_of || sf.formula !== null;
                  return (
                    <label key={sf.id} style={fieldStyle}>
                      <span style={labelStyle()}>{sf.field!.name}{!computed && sf.required && " *"}</span>
                      {computed ? (
                        <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)", fontStyle: "italic" }}>
                          Se completa automáticamente al guardar.
                        </span>
                      ) : (
                        <FieldInput
                          name={`field_${sf.field_catalog_id}`}
                          dataType={sf.field!.data_type}
                          required={sf.required}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            );
          })}

          {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

          <button
            type="submit"
            disabled={pending}
            style={{
              alignSelf: "flex-start",
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-fg)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "0.65rem 1.35rem",
              font: "inherit",
              fontWeight: 700,
              boxShadow: "var(--sh-soft)",
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
