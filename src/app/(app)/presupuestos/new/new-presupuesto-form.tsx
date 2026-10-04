"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPresupuesto } from "@/lib/presupuestos/actions";
import { deleteSavedValue, saveFieldValue } from "@/lib/templates/actions";
import { ItemsEditor } from "../items-editor";
import { ClientPicker } from "../client-picker";
import { HelpButton } from "@/components/help-button";
import type { Cliente, DataType, FieldSavedValue, ItemConceptValue, TemplateWithPages } from "@/lib/types";

const HELP_STEPS = [
  "Primero elige una Plantilla de la lista — ahí está el diseño que va a tener tu presupuesto.",
  "Elige un cliente ya guardado, o toca \"+ Nuevo cliente\" para crear uno con su Nombre y Correo — ahí es donde le vas a poder enviar el presupuesto después.",
  "Más abajo, llena los campos de cada sección (por ejemplo, la lista de ítems con su Cantidad y Precio unitario).",
  "En una sección de ítems, toca \"Agregar ítem\" para sumar una fila nueva, o el ícono de basurita para quitar una.",
  "El ícono de disquete junto a un campo guarda ese valor para que la próxima vez lo puedas elegir de una lista, sin escribirlo de nuevo.",
  "Cuando termines, toca el botón \"Guardar y ver vista previa\" al final — ahí vas a poder revisar todo antes de enviarlo.",
];

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

export function FieldLabel({
  text,
  required,
  helpText,
}: {
  text: string;
  required?: boolean;
  helpText?: string | null;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
      <span style={labelStyle()}>
        {text}
        {required && " *"}
      </span>
      {helpText && (
        <span
          title={helpText}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "1px solid var(--ink-faint)",
            color: "var(--ink-faint)",
            fontSize: "0.6rem",
            fontWeight: 700,
            cursor: "help",
            flex: "0 0 auto",
          }}
        >
          ?
        </span>
      )}
    </span>
  );
}

export function FieldInput({
  name,
  dataType,
  required,
  defaultValue,
  inputRef,
}: {
  name: string;
  dataType: DataType;
  required: boolean;
  defaultValue?: string;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
  switch (dataType) {
    case "texto_largo":
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          name={name}
          required={required}
          rows={3}
          defaultValue={defaultValue}
          style={inputStyle}
        />
      );
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
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          name={name}
          required={required}
          defaultValue={defaultValue}
          style={inputStyle}
        />
      );
  }
}

function normalizeForFilter(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

type SavedValue = { id: string | null; value: string };

export function FieldInputWithSaved({
  name,
  fieldCatalogId,
  dataType,
  required,
  defaultValue,
  useSavedValues,
  initialSavedValues,
}: {
  name: string;
  fieldCatalogId: string;
  dataType: DataType;
  required: boolean;
  defaultValue?: string;
  useSavedValues: boolean;
  initialSavedValues: FieldSavedValue[];
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState<SavedValue[]>(
    () => initialSavedValues.map((sv) => ({ id: sv.id, value: sv.value })),
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalizeForFilter(query);
    return saved
      .filter((sv) => normalizeForFilter(sv.value).includes(q))
      .sort((a, b) => a.value.localeCompare(b.value, "es"));
  }, [saved, query]);

  if (!useSavedValues) {
    return <FieldInput name={name} dataType={dataType} required={required} defaultValue={defaultValue} />;
  }

  const handleSave = () => {
    const value = inputRef.current?.value ?? "";
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaveError(null);
    if (saved.some((sv) => sv.value.toLowerCase() === trimmed.toLowerCase())) {
      setSaveError("Ya guardaste un valor igual (sin importar mayúsculas/minúsculas).");
      return;
    }
    startTransition(async () => {
      const result = await saveFieldValue(fieldCatalogId, trimmed);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setSaved((prev) => [...prev, { id: result.row.id, value: result.row.value }]);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    });
  };

  const handlePick = (value: string) => {
    if (inputRef.current) inputRef.current.value = value;
    setOpen(false);
    setQuery("");
  };

  const handleDelete = (sv: SavedValue) => {
    setSaved((prev) => prev.filter((s) => s.value !== sv.value));
    if (sv.id) startTransition(() => deleteSavedValue(sv.id!));
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <FieldInput name={name} dataType={dataType} required={required} defaultValue={defaultValue} inputRef={inputRef} />
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button
          type="button"
          onClick={handleSave}
          title="Guardar este valor para reusarlo después"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            padding: "0.3rem 0.6rem",
            font: "inherit",
            fontSize: "0.75rem",
            color: justSaved ? "var(--accent)" : "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {justSaved ? "Guardado" : "Guardar"}
        </button>
        {saved.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            title="Usar un valor guardado"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              background: "transparent",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              padding: "0.3rem 0.6rem",
              font: "inherit",
              fontSize: "0.75rem",
              color: "var(--ink-dim)",
              cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
            Usar guardado ({saved.length})
          </button>
        )}
      </div>
      {saveError && <p style={{ color: "var(--danger)", fontSize: "0.75rem", margin: 0 }}>{saveError}</p>}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "0.25rem",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--sh-soft)",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            maxHeight: 240,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar..."
              style={{ ...inputStyle, flex: 1, borderRadius: 0, border: "none" }}
            />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              aria-label="Cerrar"
              style={{ background: "transparent", border: "none", color: "var(--ink-faint)", cursor: "pointer", padding: "0.6rem" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div style={{ overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <p style={{ padding: "0.6rem 0.85rem", fontSize: "0.8rem", color: "var(--ink-faint)" }}>Sin resultados.</p>
            ) : (
              filtered.map((sv) => (
                <div
                  key={sv.value}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.15rem 0.35rem" }}
                >
                  <button
                    type="button"
                    onClick={() => handlePick(sv.value)}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      padding: "0.5rem",
                      font: "inherit",
                      fontSize: "0.8rem",
                      color: "var(--ink)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sv.value}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sv)}
                    aria-label="Eliminar valor guardado"
                    style={{ background: "transparent", border: "none", color: "var(--ink-faint)", cursor: "pointer", padding: "0.25rem", flex: "0 0 auto" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NewPresupuestoForm({
  templates,
  savedValuesByField,
  savedConcepts,
  clientes,
  defaultTemplateId,
}: {
  templates: TemplateWithPages[];
  savedValuesByField: Record<string, FieldSavedValue[]>;
  savedConcepts: ItemConceptValue[];
  clientes: Cliente[];
  defaultTemplateId?: string | null;
}) {
  // Si la plantilla por defecto de la cuenta sigue existiendo entre
  // las disponibles, se precarga sola — si no (se borró, por ejemplo),
  // queda el placeholder de elegir a mano de siempre.
  const [templateId, setTemplateId] = useState<string>(() =>
    defaultTemplateId && templates.some((t) => t.id === defaultTemplateId) ? defaultTemplateId : "",
  );
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Nuevo presupuesto</h1>
          <HelpButton title="Cómo crear un presupuesto" steps={HELP_STEPS} />
        </div>
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
              Elige una plantilla
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
          <ClientPicker clientes={clientes} />

          {sections.map((section) => {
            if (section.type === "tabla_items") {
              return (
                <div key={section.id} style={cardStyle}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem" }}>
                    {section.title}
                  </span>
                  <ItemsEditor sectionId={section.id} initialItems={[]} savedConcepts={savedConcepts} />
                </div>
              );
            }

            // Las "líneas combinadas" (sf.field null) no se completan a
            // mano — se calculan solas a partir de otros campos. Una
            // sección sin ningún campo editable de verdad (todo
            // combinado o automático) no tiene nada que hacer en el
            // formulario de carga.
            const fillableFields = section.fields.filter((sf) => sf.field);
            const hasEditableFields = fillableFields.some((sf) => !sf.number_in_words_of && sf.formula === null);
            if (!hasEditableFields) return null;
            return (
              <div key={section.id} style={cardStyle}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem" }}>
                  {section.title}
                </span>
                {fillableFields.map((sf) => {
                  const computed = sf.number_in_words_of || sf.formula !== null;
                  return (
                    <label key={sf.id} style={fieldStyle}>
                      <FieldLabel text={sf.field!.name} required={!computed && sf.required} helpText={sf.field!.help_text} />
                      {computed ? (
                        <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)", fontStyle: "italic" }}>
                          Se completa automáticamente al guardar.
                        </span>
                      ) : (
                        <FieldInputWithSaved
                          name={`field_${sf.field_catalog_id}`}
                          fieldCatalogId={sf.field_catalog_id as string}
                          dataType={sf.field!.data_type}
                          required={sf.required}
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
            {pending ? "Guardando..." : "Guardar y ver vista previa"}
          </button>
        </>
      )}
    </form>
  );
}
