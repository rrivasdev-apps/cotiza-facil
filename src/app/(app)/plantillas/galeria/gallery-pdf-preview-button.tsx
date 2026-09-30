"use client";

import { useState } from "react";

export function GalleryPdfPreviewButton({ templateKey }: { templateKey: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const view = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/plantillas/galeria/${templateKey}/pdf`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo generar el PDF de ejemplo.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <button
        type="button"
        onClick={view}
        disabled={pending}
        style={{
          width: "100%",
          background: "transparent",
          border: "1px solid var(--line)",
          color: "var(--ink-dim)",
          borderRadius: 8,
          padding: "0.55rem 1rem",
          font: "inherit",
          fontWeight: 600,
          fontSize: "0.85rem",
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Generando..." : "Ver PDF de ejemplo"}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.75rem" }}>{error}</span>}
    </div>
  );
}
