"use client";

import { useState } from "react";
import { getPresupuestoPdfUrl } from "@/lib/presupuestos/actions";

const buttonStyle: React.CSSProperties = {
  background: "var(--ink)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "0.6rem 1.25rem",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: "var(--ink-dim)",
  boxShadow: "var(--sh-soft)",
};

export function ExportPdfButton({ presupuestoId, hasPdf }: { presupuestoId: string; hasPdf: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const openUrl = (u: string) => {
    setUrl(u);
    window.open(u, "_blank", "noopener,noreferrer");
  };

  const exportPdf = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/presupuestos/${presupuestoId}/export`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo exportar el PDF.");
      openUrl(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setPending(false);
    }
  };

  const viewLastPdf = async () => {
    setPending(true);
    setError(null);
    try {
      const u = await getPresupuestoPdfUrl(presupuestoId);
      openUrl(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 816 }}>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="button" onClick={exportPdf} disabled={pending} style={buttonStyle}>
          {pending ? "Generando..." : "Exportar PDF"}
        </button>
        {hasPdf && (
          <button type="button" onClick={viewLastPdf} disabled={pending} style={secondaryButtonStyle}>
            Ver último PDF
          </button>
        )}
      </div>
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: "0.85rem" }}>
          Abrir PDF en una pestaña nueva
        </a>
      )}
    </div>
  );
}
