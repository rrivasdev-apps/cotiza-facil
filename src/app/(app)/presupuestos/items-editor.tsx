"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deleteItemConcept, saveItemConceptsNow } from "@/lib/presupuestos/actions";
import { formatMoney, grandTotal, lineTotal } from "@/lib/presupuesto-items";
import type { ItemConceptValue, PresupuestoItem } from "@/lib/types";

const EMPTY_ITEM: PresupuestoItem = { concepto: "", cantidad: "", precioUnitario: "" };

function normalizeForFilter(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.6rem",
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.85rem",
};

const textareaStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.55rem 0.75rem",
  font: "inherit",
  resize: "vertical",
};

const numberInputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.55rem 0.75rem",
  font: "inherit",
  width: 120,
};

const smallLabelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

// Concepto es texto libre, a veces largo, y de una sección a otra se
// repiten frases casi iguales ("Diseño de identidad visual para..." x
// 8 variantes) — por eso el filtro busca por cualquier fragmento del
// texto (no solo el principio) y cada fila de la lista se muestra
// completa, sin recortar con "...": si la diferencia entre dos
// conceptos parecidos está al final, igual se alcanza a leer.
function ConceptoField({
  value,
  onChange,
  savedConcepts,
  onDeleteSaved,
}: {
  value: string;
  onChange: (value: string) => void;
  savedConcepts: ItemConceptValue[];
  onDeleteSaved: (id: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

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
    return savedConcepts
      .filter((sv) => normalizeForFilter(sv.value).includes(q))
      .sort((a, b) => a.value.localeCompare(b.value, "es"));
  }, [savedConcepts, query]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Concepto"
        rows={2}
        style={textareaStyle}
      />
      {savedConcepts.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            alignSelf: "flex-start",
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
          Usar guardado ({savedConcepts.length})
        </button>
      )}
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
            maxHeight: 280,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar..."
              style={{ flex: 1, border: "none", borderRadius: 0, padding: "0.5rem 0.6rem", font: "inherit" }}
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
                  key={sv.id}
                  style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", padding: "0.15rem 0.35rem" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(sv.value);
                      setOpen(false);
                      setQuery("");
                    }}
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
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {sv.value}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSaved(sv.id)}
                    aria-label="Eliminar valor guardado"
                    style={{ background: "transparent", border: "none", color: "var(--ink-faint)", cursor: "pointer", padding: "0.5rem 0.25rem", flex: "0 0 auto" }}
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

// Usada en los dos formularios de presupuesto (nuevo/editar) para una
// sección tipo "tabla_items". A diferencia del resto de los campos, no
// hay uno por template_section_fields — la cantidad de renglones la
// decide quien carga el presupuesto, así que va con estado propio acá
// y se manda al server action como un solo input oculto con JSON
// (items_<sectionId>), no como inputs individuales por fila.
export function ItemsEditor({
  sectionId,
  initialItems,
  savedConcepts = [],
}: {
  sectionId: string;
  initialItems: PresupuestoItem[];
  savedConcepts?: ItemConceptValue[];
}) {
  const [items, setItems] = useState<PresupuestoItem[]>(
    initialItems.length > 0 ? initialItems : [{ ...EMPTY_ITEM }],
  );
  const [concepts, setConcepts] = useState(savedConcepts);

  const updateItem = (index: number, patch: Partial<PresupuestoItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteSavedConcept = (id: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== id));
    deleteItemConcept(id).catch(() => {
      // Best-effort: si falla, se vuelve a cargar en el próximo refresh de la página.
    });
  };

  // Al pedir una fila nueva, la que se acaba de terminar queda
  // guardada de una vez — así está disponible para las filas
  // siguientes de ESTE MISMO presupuesto, no recién en el próximo. La
  // última fila (la que nunca pasa por acá, porque después de
  // llenarla no se pide otra) y el caso de un solo ítem los cubre el
  // guardado de siempre al guardar el presupuesto entero.
  const addItem = () => {
    const pending = items.map((item) => item.concepto).filter((c) => c.trim());
    if (pending.length > 0) {
      saveItemConceptsNow(pending)
        .then((saved) => {
          if (saved.length === 0) return;
          setConcepts((prev) => {
            const existing = new Set(prev.map((c) => normalizeForFilter(c.value)));
            const toAdd = saved.filter((c) => !existing.has(normalizeForFilter(c.value)));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
          });
        })
        .catch(() => {
          // Best-effort: si falla, igual queda cubierto al guardar el presupuesto.
        });
    }
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <input type="hidden" name={`items_${sectionId}`} value={JSON.stringify(items)} />

      {items.map((item, index) => (
        <div key={index} style={rowStyle}>
          <ConceptoField
            value={item.concepto}
            onChange={(value) => updateItem(index, { concepto: value })}
            savedConcepts={concepts}
            onDeleteSaved={handleDeleteSavedConcept}
          />
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={smallLabelStyle}>Cantidad</span>
              <input
                type="number"
                step="0.01"
                value={item.cantidad}
                onChange={(e) => updateItem(index, { cantidad: e.target.value })}
                style={numberInputStyle}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={smallLabelStyle}>Precio unitario</span>
              <input
                type="number"
                step="0.01"
                value={item.precioUnitario}
                onChange={(e) => updateItem(index, { precioUnitario: e.target.value })}
                style={numberInputStyle}
              />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={smallLabelStyle}>Total</span>
              <span style={{ padding: "0.5rem 0" }}>{formatMoney(lineTotal(item))}</span>
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              aria-label="Quitar ítem"
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                color: "var(--ink-faint)",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "transparent",
          border: "none",
          color: "var(--accent)",
          cursor: "pointer",
          font: "inherit",
          fontWeight: 700,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Agregar ítem
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ height: 1, background: "var(--line)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Total General</span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem" }}>
            {formatMoney(grandTotal(items))}
          </span>
        </div>
      </div>
    </div>
  );
}
