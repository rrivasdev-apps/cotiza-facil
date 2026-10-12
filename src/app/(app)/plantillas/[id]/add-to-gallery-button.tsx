"use client";

import { useState, useTransition } from "react";
import { addTemplateToGallery } from "@/lib/templates/gallery-admin";

// Solo visible para el administrador de la plataforma (ver
// isPlatformAdmin en layout.tsx) — convierte ESTA plantilla (tal como
// está guardada ahora mismo) en un elemento más de la galería pública
// (/plantillas/galeria), visible para todas las cuentas. No afecta en
// nada a la plantilla original ni a la cuenta que la creó.
export function AddToGalleryButton({ templateId, defaultName }: { templateId: string; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <span style={{ fontSize: "0.8125rem", color: "var(--accent)", fontWeight: 600 }}>✓ Agregada a la galería</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          padding: "0.45rem 0.9rem",
          font: "inherit",
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "var(--ink-dim)",
          cursor: "pointer",
        }}
      >
        Agregar a la galería
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--sh-soft)",
        padding: "1rem 1.1rem",
      }}
    >
      <strong style={{ fontSize: "0.85rem" }}>Agregar esta plantilla a la galería</strong>
      <p style={{ fontSize: "0.8rem", color: "var(--ink-dim)", margin: 0 }}>
        Queda disponible para que cualquier cuenta la use como punto de partida, tal como está armada ahora mismo. La
        plantilla original no se toca.
      </p>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</p>}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre en la galería"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          padding: "0.55rem 0.8rem",
          font: "inherit",
          fontSize: "0.85rem",
        }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción corta — para qué sirve y a quién le conviene"
        rows={2}
        style={{
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          padding: "0.55rem 0.8rem",
          font: "inherit",
          fontSize: "0.85rem",
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await addTemplateToGallery(templateId, name, description);
                setDone(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Ocurrió un error.");
              }
            });
          }}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "0.5rem 1rem",
            font: "inherit",
            fontSize: "0.8125rem",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Agregando…" : "Agregar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          style={{ background: "transparent", border: "none", color: "var(--ink-dim)", cursor: "pointer", font: "inherit", fontSize: "0.8125rem" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
