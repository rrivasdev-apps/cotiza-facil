"use client";

import { useState, useTransition } from "react";
import { createCatalogField, deleteCatalogField, updateCatalogField } from "@/lib/templates/actions";
import { DATA_TYPES, type DataType, type FieldCatalogEntry } from "@/lib/types";

const TYPE_COLORS: Record<DataType, { bg: string; fg: string }> = {
  texto_corto: { bg: "var(--bg)", fg: "var(--ink-dim)" },
  fecha: { bg: "var(--bg)", fg: "var(--ink-dim)" },
  texto_largo: { bg: "var(--info-soft)", fg: "var(--info)" },
  lista: { bg: "var(--info-soft)", fg: "var(--info)" },
  moneda: { bg: "var(--accent-soft)", fg: "var(--accent)" },
};

const inputStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.6rem 0.85rem",
  font: "inherit",
  fontSize: "0.875rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

export function CatalogoList({ fields }: { fields: FieldCatalogEntry[] }) {
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<DataType>("texto_corto");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(() => createCatalogField(null, name.trim(), dataType));
          setName("");
        }}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "0.85rem",
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--sh-soft)",
          padding: "1.1rem 1.35rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="catalogo-field-name">
            Nombre del campo
          </label>
          <input
            id="catalogo-field-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Ciudad"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ width: 190, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="catalogo-field-type">
            Tipo de campo
          </label>
          <select
            id="catalogo-field-type"
            value={dataType}
            onChange={(e) => setDataType(e.target.value as DataType)}
            style={inputStyle}
          >
            {DATA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "0.6rem 1.15rem",
            font: "inherit",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Agregar
        </button>
      </form>

      {fields.length === 0 ? (
        <p style={{ color: "var(--ink-dim)" }}>Todavía no hay campos en el catálogo.</p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            background: "var(--card)",
            boxShadow: "var(--sh-soft)",
            overflow: "hidden",
          }}
        >
          {fields.map((field, i) => (
            <CatalogFieldRow key={field.id} field={field} run={run} isLast={i === fields.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogFieldRow({
  field,
  run,
  isLast,
}: {
  field: FieldCatalogEntry;
  run: (fn: () => Promise<unknown>) => void;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(field.name);
  const [dataType, setDataType] = useState<DataType>(field.data_type);
  const borderBottom = isLast ? "none" : "1px solid var(--line)";

  const save = () => {
    if (!name.trim()) return;
    run(() => updateCatalogField(field.id, name.trim(), dataType));
    setEditing(false);
  };

  const cancel = () => {
    setName(field.name);
    setDataType(field.data_type);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", padding: "0.9rem 1.25rem", borderBottom }}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
        <select value={dataType} onChange={(e) => setDataType(e.target.value as DataType)} style={inputStyle}>
          {DATA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "0.5rem 1rem",
            font: "inherit",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={cancel}
          style={{ background: "transparent", border: "none", color: "var(--ink-dim)", cursor: "pointer", font: "inherit" }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  const colors = TYPE_COLORS[field.data_type];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1.25rem", borderBottom }}>
      <span style={{ flex: 1, fontWeight: 600, fontSize: "0.9rem" }}>{field.name}</span>
      <span
        style={{
          padding: "0.25rem 0.6rem",
          borderRadius: 6,
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.03em",
          background: colors.bg,
          color: colors.fg,
          flex: "0 0 auto",
        }}
      >
        {field.data_type.toUpperCase()}
      </span>
      <div style={{ display: "flex", gap: "0.35rem", flex: "0 0 auto" }}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar"
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => run(() => deleteCatalogField(field.id))}
          aria-label="Eliminar"
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
