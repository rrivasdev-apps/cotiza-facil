"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { renderTemplatePreviewHtml } from "@/lib/templates/actions";
import type { FieldCatalogEntry, PageWithSections, Template } from "@/lib/types";

// Tamaño real de una hoja Carta a 96dpi — mismo valor que usa
// render-document.ts para cada página del PDF.
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

  // En mobile el contenedor es más angosto que PAGE_WIDTH (a
  // diferencia del layout de desktop, pensado en la nota de arriba) —
  // sin esto, el iframe de ancho fijo se salía del contenedor y solo
  // se veía una tira angosta, con scroll horizontal, de la hoja.
  //
  // Ref callback en vez de useRef + useEffect(,[]): el wrapper solo
  // existe en el DOM una vez que `html` llegó (ver el ternario de
  // abajo), así que un efecto con deps vacías corre antes de que el
  // nodo exista y el observer nunca se conecta. El callback se
  // dispara justo cuando React monta/desmonta el nodo real.
  const [scale, setScale] = useState(1);
  const observerRef = useRef<ResizeObserver | null>(null);
  const wrapperRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(Math.min(1, width / PAGE_WIDTH));
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);

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
              ref={wrapperRef}
              style={{
                width: "100%",
                maxWidth: PAGE_WIDTH,
                maxHeight: "75vh",
                overflowY: "auto",
                overflowX: "hidden",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                background: "#fff",
              }}
            >
              {(() => {
                const totalHeight = PAGE_HEIGHT * Math.max(pages.length, 1);
                return (
                  <div style={{ width: PAGE_WIDTH * scale, height: totalHeight * scale }}>
                    <div style={{ width: PAGE_WIDTH, height: totalHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                      <iframe
                        srcDoc={html}
                        title="Vista previa de la plantilla"
                        style={{ width: PAGE_WIDTH, height: totalHeight, border: "none", display: "block" }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
