"use client";

import { useState, useTransition } from "react";
import { deleteTemplate } from "@/lib/templates/actions";

export function DeleteTemplateButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    if (!window.confirm(`¿Eliminar la plantilla "${templateName}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTemplate(templateId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        style={{
          background: "transparent",
          border: "1px solid #c0392b",
          color: "#c0392b",
          borderRadius: 8,
          padding: "0.4rem 0.75rem",
          fontSize: "0.8rem",
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Eliminando..." : "Eliminar"}
      </button>
      {error && (
        <span style={{ color: "#c0392b", fontSize: "0.7rem", maxWidth: 200, textAlign: "right" }}>{error}</span>
      )}
    </div>
  );
}
