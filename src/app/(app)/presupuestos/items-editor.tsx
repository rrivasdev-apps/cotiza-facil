"use client";

import { useState } from "react";
import { formatMoney, grandTotal, lineTotal } from "@/lib/presupuesto-items";
import type { PresupuestoItem } from "@/lib/types";

const EMPTY_ITEM: PresupuestoItem = { concepto: "", cantidad: "", precioUnitario: "" };

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  background: "var(--bg)",
  borderRadius: 8,
  padding: "0.75rem",
};

const textareaStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  font: "inherit",
  resize: "vertical",
};

const numberInputStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  font: "inherit",
  width: 120,
};

const smallLabelStyle: React.CSSProperties = { fontSize: "0.75rem", color: "var(--ink-dim)" };

// Usada en los dos formularios de presupuesto (nuevo/editar) para una
// sección tipo "tabla_items". A diferencia del resto de los campos, no
// hay uno por template_section_fields — la cantidad de renglones la
// decide quien carga el presupuesto, así que va con estado propio acá
// y se manda al server action como un solo input oculto con JSON
// (items_<sectionId>), no como inputs individuales por fila.
export function ItemsEditor({
  sectionId,
  initialItems,
}: {
  sectionId: string;
  initialItems: PresupuestoItem[];
}) {
  const [items, setItems] = useState<PresupuestoItem[]>(
    initialItems.length > 0 ? initialItems : [{ ...EMPTY_ITEM }],
  );

  const updateItem = (index: number, patch: Partial<PresupuestoItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <input type="hidden" name={`items_${sectionId}`} value={JSON.stringify(items)} />

      {items.map((item, index) => (
        <div key={index} style={rowStyle}>
          <textarea
            value={item.concepto}
            onChange={(e) => updateItem(index, { concepto: e.target.value })}
            placeholder="Concepto"
            rows={2}
            style={textareaStyle}
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
              style={{ background: "transparent", border: "none", color: "var(--ink-dim)", cursor: "pointer", font: "inherit" }}
            >
              ×
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
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
        + Agregar ítem
      </button>

      <div style={{ fontWeight: 700, alignSelf: "flex-end" }}>Total General: {formatMoney(grandTotal(items))}</div>
    </div>
  );
}
