"use client";

import { useEffect, useRef, useState } from "react";
import { renderTemplatePreviewHtml } from "@/lib/templates/actions";
import type { FieldCatalogEntry, PageWithSections, Template } from "@/lib/types";

// Tamaño real de una hoja Carta a 96dpi — mismo valor que usa
// render-document.ts para cada página del PDF. Sin escalar: a este
// ancho, el contenedor de la app (960px, ver AppLayout) todavía deja
// lugar de sobra, así que la vista previa se ve nítida sin necesitar
// un transform:scale() calculado por JS.
const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;

const DEBOUNCE_MS = 450;

export function TemplatePreview({
  template,
  pages,
  catalog,
}: {
  template: Template;
  pages: PageWithSections[];
  catalog: FieldCatalogEntry[];
}) {
  const [open, setOpen] = useState(true);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      setPending(true);
      renderTemplatePreviewHtml(template, pages, catalog)
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setHtml(result);
          setError(null);
        })
        .catch((e) => {
          if (requestId !== requestIdRef.current) return;
          setError(e instanceof Error ? e.message : "No se pudo generar la vista previa.");
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return;
          setPending(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, template, pages, catalog]);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--sh-soft)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "0.9rem 1.25rem",
          font: "inherit",
          color: "var(--ink)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
          Vista previa
          {pending && (
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-faint)" }}>
              Actualizando...
            </span>
          )}
        </span>
        <span style={{ color: "var(--ink-dim)", fontSize: "0.8rem" }}>{open ? "Ocultar ▲" : "Mostrar ▼"}</span>
      </button>

      {open && (
        <div
          style={{
            borderTop: "1px solid var(--line)",
            background: "var(--bg)",
            padding: "1rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {error ? (
            <p style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "2rem 0" }}>{error}</p>
          ) : !html ? (
            <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem", padding: "2rem 0" }}>Generando vista previa...</p>
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: PAGE_WIDTH,
                maxHeight: "75vh",
                overflow: "auto",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                background: "#fff",
              }}
            >
              <iframe
                srcDoc={html}
                title="Vista previa de la plantilla"
                style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT * Math.max(pages.length, 1), border: "none", display: "block" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
