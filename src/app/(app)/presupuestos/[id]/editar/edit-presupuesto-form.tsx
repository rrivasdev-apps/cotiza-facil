"use client";

import { useActionState } from "react";
import { updatePresupuesto } from "@/lib/presupuestos/actions";
import { ItemsEditor } from "../../items-editor";
import type { FieldSavedValue, ItemConceptValue, Presupuesto, TemplateWithPages } from "@/lib/types";
import {
  FieldInputWithSaved,
  FieldLabel,
  cardStyle,
  fieldStyle,
  inputStyle,
  labelStyle,
} from "../../new/new-presupuesto-form";

export function EditPresupuestoForm({
  presupuesto,
  template,
  savedValuesByField,
  savedConcepts,
}: {
  presupuesto: Presupuesto;
  template: TemplateWithPages;
  savedValuesByField: Record<string, FieldSavedValue[]>;
  savedConcepts: ItemConceptValue[];
}) {
  const updateWithId = updatePresupuesto.bind(null, presupuesto.id);
  const [error, formAction, pending] = useActionState(updateWithId, null);

  const sections = template.pages.flatMap((p) => p.sections);

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}
    >
      <h1 style={{ fontSize: "1.5rem" }}>Editar presupuesto</h1>

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
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem" }}>
                {section.title}
              </span>
              <ItemsEditor
                sectionId={section.id}
                initialItems={presupuesto.items[section.id] ?? []}
                savedConcepts={savedConcepts}
              />
            </div>
          );
        }

        // Las "líneas combinadas" (sf.field null) no se editan a mano
        // acá — se recalculan solas al guardar. Una sección sin ningún
        // campo editable de verdad (todo combinado o automático) no
        // tiene nada que hacer en el formulario de carga.
        const fillableFields = section.fields.filter((sf) => sf.field);
        const hasEditableFields = fillableFields.some((sf) => !sf.number_in_words_of && sf.formula === null);
        if (!hasEditableFields) return null;
        return (
          <div key={section.id} style={cardStyle}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem" }}>
              {section.title}
            </span>
            {fillableFields.map((sf) => {
              const raw = presupuesto.data[sf.field_catalog_id as string];
              const defaultValue = Array.isArray(raw) ? raw.join("\n") : (raw ?? "");
              const computed = sf.number_in_words_of || sf.formula !== null;
              return (
                <label key={sf.id} style={fieldStyle}>
                  <FieldLabel text={sf.field!.name} required={!computed && sf.required} helpText={sf.field!.help_text} />
                  {computed ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--ink-dim)" }}>
                      {defaultValue || "—"}{" "}
                      <em style={{ color: "var(--ink-faint)", fontStyle: "italic" }}>(automático)</em>
                    </span>
                  ) : (
                    <FieldInputWithSaved
                      name={`field_${sf.field_catalog_id}`}
                      fieldCatalogId={sf.field_catalog_id as string}
                      dataType={sf.field!.data_type}
                      required={sf.required}
                      defaultValue={defaultValue}
                      useSavedValues={sf.field!.use_saved_values}
                      initialSavedValues={savedValuesByField[sf.field_catalog_id as string] ?? []}
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
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
