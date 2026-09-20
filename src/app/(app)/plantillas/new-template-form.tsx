"use client";

import { useActionState } from "react";
import { createTemplate } from "@/lib/templates/actions";

export function NewTemplateForm() {
  const [error, formAction, pending] = useActionState(createTemplate, null);

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        background: "var(--card)",
        borderRadius: 12,
        boxShadow: "var(--sh-soft)",
        padding: "1rem 1.25rem",
      }}
    >
      <input
        type="text"
        name="name"
        placeholder="Nombre de la plantilla"
        required
        style={{
          flex: 1,
          minWidth: 0,
          background: "var(--bg)",
          border: "none",
          borderRadius: 8,
          padding: "0.6rem 0.75rem",
          font: "inherit",
          color: "var(--ink)",
        }}
      />
      <button
        type="submit"
        disabled={pending}
        style={{
          background: "var(--ink)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "0.6rem 1rem",
          font: "inherit",
          fontWeight: 600,
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Creando..." : "Nueva plantilla"}
      </button>
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}
    </form>
  );
}
