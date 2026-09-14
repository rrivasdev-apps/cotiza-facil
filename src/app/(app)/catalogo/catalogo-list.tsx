"use client";

import { useState, useTransition } from "react";
import { createCatalogField, deleteCatalogField } from "@/lib/templates/actions";
import { DATA_TYPES, type DataType, type FieldCatalogEntry } from "@/lib/types";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(() => createCatalogField(null, name.trim(), dataType));
          setName("");
        }}
        style={{
          display: "flex",
          gap: "0.75rem",
          background: "var(--card)",
          borderRadius: 12,
          boxShadow: "var(--sh-soft)",
          padding: "1rem 1.25rem",
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del campo"
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
          value={dataType}
          onChange={(e) => setDataType(e.target.value as DataType)}
          style={{
            background: "var(--bg)",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 0.75rem",
            font: "inherit",
          }}
        >
          {DATA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 1rem",
            font: "inherit",
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
          }}
        >
          Agregar
        </button>
      </form>

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", listStyle: "none" }}>
        {fields.map((field) => (
          <li
            key={field.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--card)",
              borderRadius: 12,
              boxShadow: "var(--sh-soft)",
              padding: "0.75rem 1.25rem",
            }}
          >
            <span>{field.name}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
              }}
            >
              {field.data_type}
            </span>
            <button
              type="button"
              onClick={() => run(() => deleteCatalogField(field.id))}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-dim)",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              Eliminar
            </button>
          </li>
        ))}
        {fields.length === 0 && (
          <p style={{ color: "var(--ink-dim)" }}>Todavía no hay campos en el catálogo.</p>
        )}
      </ul>
    </div>
  );
}
