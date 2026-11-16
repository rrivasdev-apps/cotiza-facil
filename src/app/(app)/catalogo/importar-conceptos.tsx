"use client";

import { useMemo, useState, useTransition } from "react";
import { importItemConcepts } from "@/lib/presupuestos/actions";
import { useCurrency } from "@/components/currency-context";
import { MAX_IMPORT_ROWS, parseConceptRows } from "@/lib/concept-import";
import { formatMoney, suggestShortName } from "@/lib/presupuesto-items";
import type { ItemConceptValue } from "@/lib/types";

type RowStatus = "nuevo" | "actualiza" | "repetido" | "error";

const STATUS_LABEL: Record<RowStatus, string> = {
  nuevo: "NUEVO",
  actualiza: "ACTUALIZA",
  repetido: "REPETIDO",
  error: "ERROR",
};

const STATUS_COLOR: Record<RowStatus, string> = {
  nuevo: "var(--accent)",
  actualiza: "var(--ink-dim)",
  repetido: "var(--ink-faint)",
  error: "var(--danger)",
};

const cellStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontSize: "0.8rem",
  verticalAlign: "top",
  borderBottom: "1px solid var(--line)",
};

const headStyle: React.CSSProperties = {
  ...cellStyle,
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  position: "sticky",
  top: 0,
  background: "var(--card)",
};

// Pegar desde Excel / Google Sheets: se copia el bloque completo de
// celdas de una sola vez (no fila por fila) y la vista previa muestra
// qué pasaría con cada fila antes de guardar nada.
export function ImportarConceptos({ concepts }: { concepts: ItemConceptValue[] }) {
  const currency = useCurrency();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => {
    const parsed = parseConceptRows(text);
    const existingKeys = new Set(concepts.map((concept) => concept.value.trim().toLowerCase()));

    // Si un concepto aparece dos veces en lo pegado gana la última fila
    // (el servidor hace lo mismo) — la anterior se marca como repetida.
    const lastIndexByKey = new Map<string, number>();
    parsed.forEach((row, index) => {
      if (!row.error) lastIndexByKey.set(row.concept.toLowerCase(), index);
    });

    const rows = parsed.map((row, index) => {
      let status: RowStatus;
      if (row.error) status = "error";
      else if (lastIndexByKey.get(row.concept.toLowerCase()) !== index) status = "repetido";
      else status = existingKeys.has(row.concept.toLowerCase()) ? "actualiza" : "nuevo";
      return { ...row, status };
    });

    const toImport = rows.filter((row) => row.status === "nuevo" || row.status === "actualiza");
    return {
      rows,
      toImport,
      created: toImport.filter((row) => row.status === "nuevo").length,
      updated: toImport.filter((row) => row.status === "actualiza").length,
      errors: rows.filter((row) => row.status === "error").length,
      repeated: rows.filter((row) => row.status === "repetido").length,
      ambiguous: toImport.filter((row) => row.priceAmbiguous).length,
    };
  }, [text, concepts]);

  const tooMany = preview.toImport.length > MAX_IMPORT_ROWS;
  const canImport = preview.toImport.length > 0 && !tooMany && !pending;

  const close = () => {
    setOpen(false);
    setText("");
    setError(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await importItemConcepts(
          preview.toImport.map((row) => ({ shortName: row.shortName, concept: row.concept, price: row.price })),
        );
        setText("");
        setOpen(false);
        setDone(
          `Listo: ${result.created} ${result.created === 1 ? "concepto nuevo" : "conceptos nuevos"}` +
            (result.updated > 0 ? ` y ${result.updated} ${result.updated === 1 ? "actualizado" : "actualizados"}.` : "."),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  if (!open) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            setDone(null);
            setOpen(true);
          }}
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            padding: "0.55rem 1rem",
            font: "inherit",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--ink)",
            cursor: "pointer",
          }}
        >
          Pegar desde hoja de cálculo
        </button>
        {done && <span style={{ color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600 }}>{done}</span>}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--sh-soft)",
        padding: "1.1rem 1.35rem",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Pegar desde Excel o Google Sheets</div>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.8rem", marginTop: "0.25rem", lineHeight: 1.5 }}>
          Selecciona todas las filas de una vez en tu hoja, cópialas y pégalas aquí. Columnas, en este orden:{" "}
          <strong>Nombre corto · Concepto · Precio</strong> (con solo dos columnas se toman Concepto y Precio, y el
          nombre corto se genera solo). Si tu hoja tiene encabezados, se detectan. Los conceptos que ya existen
          actualizan su precio.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Logo\tDiseño de logotipo con 3 propuestas\t150\nWeb\tSitio web de 5 páginas\t1.200,50"}
        rows={6}
        autoFocus
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          padding: "0.6rem 0.85rem",
          font: "inherit",
          fontSize: "0.85rem",
          resize: "vertical",
        }}
      />

      {preview.rows.length > 0 && (
        <>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-dim)", display: "flex", flexWrap: "wrap", gap: "0.25rem 1rem" }}>
            <span>
              <strong style={{ color: "var(--accent)" }}>{preview.created}</strong> nuevos
            </span>
            <span>
              <strong>{preview.updated}</strong> se actualizarán
            </span>
            {preview.repeated > 0 && <span>{preview.repeated} repetidos en lo pegado (se usa el último)</span>}
            {preview.errors > 0 && (
              <span style={{ color: "var(--danger)" }}>
                {preview.errors} con error (no se importan)
              </span>
            )}
          </div>
          {preview.ambiguous > 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>
              ⚠ En {preview.ambiguous} {preview.ambiguous === 1 ? "precio" : "precios"} no se podía saber si el
              punto o la coma son decimales (ej. 1.234); se tomaron como miles. Revisa la columna Precio.
            </p>
          )}

          <div
            style={{
              maxHeight: 320,
              overflow: "auto",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={headStyle}>Fila</th>
                  <th style={headStyle}>Nombre corto</th>
                  <th style={headStyle}>Concepto</th>
                  <th style={headStyle}>Precio</th>
                  <th style={headStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.line} style={{ opacity: row.status === "repetido" ? 0.55 : 1 }}>
                    <td style={{ ...cellStyle, color: "var(--ink-faint)" }}>{row.line}</td>
                    <td style={cellStyle}>{row.shortName || (row.concept ? suggestShortName(row.concept) : "")}</td>
                    <td style={{ ...cellStyle, whiteSpace: "pre-wrap" }}>{row.concept}</td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                      {row.price != null ? formatMoney(row.price, currency) : "—"}
                      {row.priceAmbiguous && " ⚠"}
                    </td>
                    <td style={{ ...cellStyle, fontWeight: 700, fontSize: "0.68rem", color: STATUS_COLOR[row.status] }}>
                      {STATUS_LABEL[row.status]}
                      {row.error && <div style={{ fontWeight: 400, fontSize: "0.75rem" }}>{row.error}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tooMany && (
        <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
          Máximo {MAX_IMPORT_ROWS} conceptos por importación. Divide la hoja en partes.
        </p>
      )}
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={submit}
          disabled={!canImport}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "0.6rem 1.15rem",
            font: "inherit",
            fontSize: "0.875rem",
            fontWeight: 700,
            opacity: canImport ? 1 : 0.5,
            cursor: canImport ? "pointer" : "default",
          }}
        >
          {pending ? "Importando…" : `Importar ${preview.toImport.length || ""}`.trim()}
        </button>
        <button
          type="button"
          onClick={close}
          style={{ background: "transparent", border: "none", color: "var(--ink-dim)", cursor: "pointer", font: "inherit" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
