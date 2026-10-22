"use client";

import { useState, useTransition } from "react";
import { createItemConcept, deleteItemConcept, updateItemConcept } from "@/lib/presupuestos/actions";
import { formatMoney, suggestShortName } from "@/lib/presupuesto-items";
import type { ItemConceptValue } from "@/lib/types";
import { ListToolbar, compareText, useListControls } from "@/components/list-toolbar";
import type { SortOption } from "@/components/list-toolbar";

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

// Mismo catálogo que alimenta "Usar guardado" en el editor de ítems
// de un presupuesto (ver items-editor.tsx) — acá se puede ver todo de
// una vez, y cargar un producto/servicio con precio de antemano, sin
// tener que pasar primero por un presupuesto.
const displayName = (concept: ItemConceptValue) => concept.short_name ?? concept.value;

const SORT_OPTIONS: SortOption<ItemConceptValue>[] = [
  { key: "nombre", label: "Nombre", defaultDir: "asc", compare: (a, b) => compareText(displayName(a), displayName(b)) },
];

// Busca tanto en el nombre corto como en el descriptivo completo.
const searchText = (concept: ItemConceptValue) => `${concept.short_name ?? ""} ${concept.value}`;

export function ProductosList({ concepts }: { concepts: ItemConceptValue[] }) {
  const [value, setValue] = useState("");
  const [shortName, setShortName] = useState("");
  const [shortNameTouched, setShortNameTouched] = useState(false);
  const [unitPrice, setUnitPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { visible, filtering, toolbarProps } = useListControls({
    items: concepts,
    searchText,
    sortOptions: SORT_OPTIONS,
  });

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

  const reset = () => {
    setValue("");
    setShortName("");
    setShortNameTouched(false);
    setUnitPrice("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          run(() => createItemConcept(value.trim(), unitPrice, shortName));
          reset();
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
        <div style={{ flexBasis: "100%", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="producto-concepto">
            Producto o servicio
          </label>
          <textarea
            id="producto-concepto"
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              setValue(next);
              if (!shortNameTouched) setShortName(suggestShortName(next));
            }}
            placeholder="Ej. Sesión de fotos"
            rows={2}
            required
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="producto-nombre-corto">
            Nombre corto (para buscar)
          </label>
          <input
            id="producto-nombre-corto"
            value={shortName}
            onChange={(e) => {
              setShortName(e.target.value);
              setShortNameTouched(true);
            }}
            placeholder="Se completa solo — edítalo si quieres"
            maxLength={60}
            style={inputStyle}
          />
        </div>
        <div style={{ width: 160, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="producto-precio">
            Precio unitario
          </label>
          <input
            id="producto-precio"
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="Opcional"
            style={inputStyle}
          />
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

      {concepts.length > 0 && <ListToolbar {...toolbarProps} searchPlaceholder="Buscar producto por nombre…" />}

      {concepts.length === 0 ? (
        <p style={{ color: "var(--ink-dim)" }}>Todavía no hay productos ni servicios guardados.</p>
      ) : visible.length === 0 && filtering ? (
        <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem" }}>Ningún producto coincide con la búsqueda.</p>
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
          {visible.map((concept, i) => (
            <ProductoRow key={concept.id} concept={concept} run={run} isLast={i === visible.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductoRow({
  concept,
  run,
  isLast,
}: {
  concept: ItemConceptValue;
  run: (fn: () => Promise<unknown>) => void;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(concept.value);
  const [shortName, setShortName] = useState(concept.short_name ?? suggestShortName(concept.value));
  const [shortNameTouched, setShortNameTouched] = useState(false);
  const [unitPrice, setUnitPrice] = useState(concept.unit_price != null ? String(concept.unit_price) : "");
  const borderBottom = isLast ? "none" : "1px solid var(--line)";

  const save = () => {
    if (!value.trim()) return;
    run(() => updateItemConcept(concept.id, value.trim(), unitPrice, shortName));
    setEditing(false);
  };

  const cancel = () => {
    setValue(concept.value);
    setShortName(concept.short_name ?? suggestShortName(concept.value));
    setShortNameTouched(false);
    setUnitPrice(concept.unit_price != null ? String(concept.unit_price) : "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.9rem 1.25rem", borderBottom }}>
        <textarea
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            if (!shortNameTouched) setShortName(suggestShortName(next));
          }}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
          <input
            value={shortName}
            onChange={(e) => {
              setShortName(e.target.value);
              setShortNameTouched(true);
            }}
            placeholder="Nombre corto"
            maxLength={60}
            style={{ ...inputStyle, flex: 1, minWidth: 120 }}
          />
          <input
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="Precio"
            style={{ ...inputStyle, width: 140 }}
          />
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
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1.25rem", borderBottom }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{concept.short_name ?? concept.value}</div>
        {concept.short_name && concept.short_name !== concept.value && (
          <div style={{ fontSize: "0.78rem", color: "var(--ink-faint)", marginTop: "0.1rem", whiteSpace: "pre-wrap" }}>
            {concept.value}
          </div>
        )}
      </div>
      <span
        style={{
          padding: "0.25rem 0.6rem",
          borderRadius: 6,
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.03em",
          background: concept.unit_price != null ? "var(--accent-soft)" : "var(--bg)",
          color: concept.unit_price != null ? "var(--accent)" : "var(--ink-faint)",
          flex: "0 0 auto",
        }}
      >
        {concept.unit_price != null ? formatMoney(concept.unit_price) : "SIN PRECIO"}
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
          onClick={() => run(() => deleteItemConcept(concept.id))}
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
