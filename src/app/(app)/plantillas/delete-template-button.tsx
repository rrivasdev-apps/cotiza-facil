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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.25rem" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="template-menu-item template-menu-item-danger"
        style={{ cursor: pending ? "default" : "pointer" }}
      >
        {pending ? "Eliminando..." : "Eliminar"}
      </button>
      {error && (
        <span style={{ color: "#c0392b", fontSize: "0.7rem", maxWidth: 200, padding: "0 0.7rem" }}>{error}</span>
      )}
    </div>
  );
}
