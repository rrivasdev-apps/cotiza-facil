"use client";

import { useState, useTransition } from "react";
import {
  addSection,
  addSectionField,
  createCatalogField,
  deleteSection,
  removeSectionField,
  renameSection,
  reorderSectionFields,
  reorderSections,
} from "@/lib/templates/actions";
import {
  DATA_TYPES,
  SECTION_TYPES,
  type DataType,
  type FieldCatalogEntry,
  type SectionType,
  type SectionWithFields,
  type Template,
} from "@/lib/types";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  borderRadius: 12,
  boxShadow: "var(--sh-soft)",
  padding: "1rem 1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const chipStyle: React.CSSProperties = {
  background: "var(--bg)",
  color: "var(--accent)",
  borderRadius: 999,
  padding: "0.3rem 0.75rem",
  fontSize: "0.85rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
};

const iconButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ink-dim)",
  cursor: "pointer",
  font: "inherit",
};

export function Estructura({
  template,
  sections,
  catalog,
}: {
  template: Template;
  sections: SectionWithFields[];
  catalog: FieldCatalogEntry[];
}) {
  const [, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<SectionType>("texto_libre");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const ids = sections.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderSections(template.id, ids));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}

      {sections.map((section, index) => (
        <SectionCard
          key={section.id}
          template={template}
          section={section}
          catalog={catalog}
          onMoveUp={index > 0 ? () => move(index, -1) : undefined}
          onMoveDown={index < sections.length - 1 ? () => move(index, 1) : undefined}
          onDelete={() => run(() => deleteSection(template.id, section.id))}
          onRename={(title) => run(() => renameSection(template.id, section.id, title))}
          run={run}
        />
      ))}

      <form
        style={{ ...cardStyle, flexDirection: "row", alignItems: "center" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!newTitle.trim()) return;
          run(() => addSection(template.id, newType, newTitle.trim()));
          setNewTitle("");
        }}
      >
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Título de la sección"
          required
          style={{
            flex: 1,
            background: "var(--bg)",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 0.75rem",
            font: "inherit",
          }}
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as SectionType)}
          style={{
            background: "var(--bg)",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 0.75rem",
            font: "inherit",
          }}
        >
          {SECTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 1rem",
            font: "inherit",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Agregar sección
        </button>
      </form>
    </div>
  );
}

function SectionCard({
  template,
  section,
  catalog,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRename,
  run,
}: {
  template: Template;
  section: SectionWithFields;
  catalog: FieldCatalogEntry[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [addingField, setAddingField] = useState(false);

  const sectionTypeLabel = SECTION_TYPES.find((t) => t.value === section.type)?.label;
  const usedFieldIds = new Set(section.fields.map((f) => f.field_catalog_id));
  const availableFields = catalog.filter((f) => !usedFieldIds.has(f.id));

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= section.fields.length) return;
    const ids = section.fields.map((f) => f.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderSectionFields(template.id, ids));
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== section.title && onRename(title.trim())}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            font: "inherit",
            fontWeight: 600,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
          }}
        >
          {sectionTypeLabel}
        </span>
        <button type="button" style={iconButtonStyle} onClick={onMoveUp} disabled={!onMoveUp}>
          ↑
        </button>
        <button type="button" style={iconButtonStyle} onClick={onMoveDown} disabled={!onMoveDown}>
          ↓
        </button>
        <button type="button" style={iconButtonStyle} onClick={onDelete}>
          Eliminar
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {section.fields.map((sf, index) => (
          <span key={sf.id} style={chipStyle}>
            {sf.field.name}
            {sf.required && " *"}
            <button
              type="button"
              onClick={() => moveField(index, -1)}
              disabled={index === 0}
              style={{ ...iconButtonStyle, color: "var(--accent)" }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveField(index, 1)}
              disabled={index === section.fields.length - 1}
              style={{ ...iconButtonStyle, color: "var(--accent)" }}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => run(() => removeSectionField(template.id, sf.id))}
              style={{ ...iconButtonStyle, color: "var(--accent)" }}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {addingField ? (
        <AddFieldForm
          templateId={template.id}
          sectionId={section.id}
          availableFields={availableFields}
          run={run}
          onDone={() => setAddingField(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingField(true)}
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            border: "none",
            color: "var(--accent)",
            cursor: "pointer",
            font: "inherit",
            fontWeight: 600,
          }}
        >
          + Agregar campo
        </button>
      )}
    </div>
  );
}

function AddFieldForm({
  templateId,
  sectionId,
  availableFields,
  run,
  onDone,
}: {
  templateId: string;
  sectionId: string;
  availableFields: FieldCatalogEntry[];
  run: (fn: () => Promise<unknown>) => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(
    availableFields.length > 0 ? "existing" : "new",
  );
  const [fieldId, setFieldId] = useState(availableFields[0]?.id ?? "");
  const [required, setRequired] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<DataType>("texto_corto");

  const submit = async () => {
    if (mode === "existing") {
      if (!fieldId) return;
      run(() => addSectionField(templateId, sectionId, fieldId, required));
    } else {
      if (!newName.trim()) return;
      run(async () => {
        const created = await createCatalogField(templateId, newName.trim(), newType);
        await addSectionField(templateId, sectionId, created.id, required);
      });
    }
    onDone();
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        alignItems: "center",
        background: "var(--bg)",
        borderRadius: 8,
        padding: "0.75rem",
      }}
    >
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setMode("existing")}
          disabled={availableFields.length === 0}
          style={{
            ...iconButtonStyle,
            fontWeight: mode === "existing" ? 700 : 400,
          }}
        >
          Del catálogo
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          style={{ ...iconButtonStyle, fontWeight: mode === "new" ? 700 : 400 }}
        >
          Campo nuevo
        </button>
      </div>

      {mode === "existing" ? (
        <select
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
          style={{ border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", font: "inherit" }}
        >
          {availableFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del campo"
            style={{ border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", font: "inherit" }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as DataType)}
            style={{ border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", font: "inherit" }}
          >
            {DATA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        Obligatorio
      </label>

      <button
        type="button"
        onClick={submit}
        style={{
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "0.4rem 0.9rem",
          font: "inherit",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Agregar
      </button>
      <button type="button" onClick={onDone} style={iconButtonStyle}>
        Cancelar
      </button>
    </div>
  );
}
