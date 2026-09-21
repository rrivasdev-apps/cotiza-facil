"use client";

import { useActionState } from "react";
import { updatePresupuesto } from "@/lib/presupuestos/actions";
import { ItemsEditor } from "../../items-editor";
import type { Presupuesto, TemplateWithPages } from "@/lib/types";
import {
  FieldInput,
  cardStyle,
  fieldStyle,
  inputStyle,
  labelStyle,
} from "../../new/new-presupuesto-form";

export function EditPresupuestoForm({
  presupuesto,
  template,
}: {
  presupuesto: Presupuesto;
  template: TemplateWithPages;
}) {
  const updateWithId = updatePresupuesto.bind(null, presupuesto.id);
  const [error, formAction, pending] = useActionState(updateWithId, null);

  const sections = template.pages.flatMap((p) => p.sections);

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 640, margin: "0 auto" }}
    >
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Editar presupuesto</h1>

      <div style={cardStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle()}>Nombre del cliente</span>
          <input
            type="text"
            name="client_name"
            defaultValue={presupuesto.client_name}
            required
            style={inputStyle}
          />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle()}>Correo del cliente</span>
          <input
            type="email"
            name="client_email"
            defaultValue={presupuesto.client_email}
            required
            style={inputStyle}
          />
        </label>
      </div>

      {sections.map((section) => {
        if (section.type === "tabla_items") {
          return (
            <div key={section.id} style={cardStyle}>
              <span style={{ fontWeight: 600 }}>{section.title}</span>
              <ItemsEditor sectionId={section.id} initialItems={presupuesto.items[section.id] ?? []} />
            </div>
          );
        }

        // Las "líneas combinadas" (sf.field null) no se editan a mano
        // acá — se recalculan solas al guardar.
        const fillableFields = section.fields.filter((sf) => sf.field);
        return (
          <div key={section.id} style={cardStyle}>
            <span style={{ fontWeight: 600 }}>{section.title}</span>
            {fillableFields.length === 0 && (
              <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>
                Esta sección no tiene campos.
              </p>
            )}
            {fillableFields.map((sf) => {
              const raw = presupuesto.data[sf.field_catalog_id as string];
              const defaultValue = Array.isArray(raw) ? raw.join("\n") : (raw ?? "");
              const computed = sf.number_in_words_of || sf.formula !== null;
              return (
                <label key={sf.id} style={fieldStyle}>
                  <span style={labelStyle()}>{sf.field!.name}{!computed && sf.required && " *"}</span>
                  {computed ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--ink-dim)" }}>
                      {defaultValue || "—"}{" "}
                      <em style={{ color: "var(--ink-faint)", fontStyle: "italic" }}>(automático)</em>
                    </span>
                  ) : (
                    <FieldInput
                      name={`field_${sf.field_catalog_id}`}
                      dataType={sf.field!.data_type}
                      required={sf.required}
                      defaultValue={defaultValue}
                    />
                  )}
                </label>
              );
            })}
          </div>
        );
      })}

      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{
          alignSelf: "flex-start",
          background: "var(--btn-primary-bg)",
          color: "var(--btn-primary-fg)",
          border: "none",
          borderRadius: 8,
          padding: "0.6rem 1.25rem",
          font: "inherit",
          fontWeight: 600,
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
