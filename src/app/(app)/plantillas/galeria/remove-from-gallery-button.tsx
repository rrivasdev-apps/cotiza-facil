"use client";

import { useState, useTransition } from "react";
import { removeTemplateFromGallery } from "@/lib/templates/gallery-admin";

// Solo para plantillas que un admin agregó desde una cuenta real (ver
// AddToGalleryButton) — las de gallery.ts (código) no tienen este
// botón, GALLERY_TEMPLATES ni siquiera pasa por acá.
export function RemoveFromGalleryButton({ templateKey }: { templateKey: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem" }}>
        <span style={{ color: "var(--ink-dim)" }}>¿Quitar de la galería?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await removeTemplateFromGallery(templateKey);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Ocurrió un error.");
                setConfirming(false);
              }
            });
          }}
          style={{ background: "transparent", border: "none", color: "var(--danger)", fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: "0.78rem" }}
        >
          Sí, quitar
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{ background: "transparent", border: "none", color: "var(--ink-dim)", cursor: "pointer", font: "inherit", fontSize: "0.78rem" }}
        >
          Cancelar
        </button>
        {error && <span style={{ color: "var(--danger)" }}>{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      style={{ background: "transparent", border: "none", color: "var(--ink-faint)", cursor: "pointer", font: "inherit", fontSize: "0.78rem", textAlign: "left", padding: 0 }}
    >
      Quitar de la galería
    </button>
  );
}
