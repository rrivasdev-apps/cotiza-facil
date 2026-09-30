"use client";

import { useState, useTransition } from "react";
import { renameTemplate } from "@/lib/templates/actions";
import type { FieldCatalogEntry, PageWithSections, Template } from "@/lib/types";
import { Estructura } from "./estructura";
import { Tema } from "./tema";
import { HelpButton } from "@/components/help-button";

const HELP_STEPS = [
  "Arriba puedes escribir para cambiarle el nombre a la plantilla — se guarda solo, sin botón de Guardar.",
  "La pestaña \"Estructura\" es donde armas el contenido: páginas, secciones y campos.",
  "Dentro de Estructura: \"Agregar página\" crea una hoja nueva, \"Agregar sección\" agrega un bloque dentro de esa página (por ejemplo, una lista de ítems o un título), y \"Agregar campo\" agrega una casilla dentro de esa sección.",
  "Cada campo se puede marcar como obligatorio, y cualquier sección o campo se puede reordenar o Eliminar.",
  "La pestaña \"Tema\" es donde pones el logo, los colores (o un degradado) y la tipografía de tu plantilla.",
  "En Tema, después de cambiar algo, toca \"Guardar\" para que no se pierda.",
];

export function TemplateEditor({
  template,
  pages,
  catalog,
}: {
  template: Template;
  pages: PageWithSections[];
  catalog: FieldCatalogEntry[];
}) {
  const [tab, setTab] = useState<"estructura" | "tema">("estructura");
  const [name, setName] = useState(template.name);
  const [, startTransition] = useTransition();
  const [nameError, setNameError] = useState<string | null>(null);

  const commitName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(template.name);
      return;
    }
    if (trimmed === template.name) return;
    setNameError(null);
    startTransition(async () => {
      try {
        await renameTemplate(template.id, trimmed);
      } catch (e) {
        setNameError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              border: "none",
              background: "transparent",
              padding: 0,
              color: "var(--ink)",
              width: "100%",
              minWidth: 0,
            }}
          />
          <HelpButton title="Cómo usar el editor de plantillas" steps={HELP_STEPS} />
        </div>
        {nameError && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{nameError}</p>}
      </div>

      <div
        style={{
          display: "inline-flex",
          gap: 2,
          background: "var(--bg)",
          borderRadius: 999,
          padding: 4,
          width: "fit-content",
        }}
      >
        {(["estructura", "tema"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "0.5rem 1.25rem",
              font: "inherit",
              fontWeight: 700,
              fontSize: "0.8125rem",
              cursor: "pointer",
              background: tab === t ? "var(--card)" : "transparent",
              boxShadow: tab === t ? "var(--sh-soft)" : "none",
              color: tab === t ? "var(--ink)" : "var(--ink-dim)",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "estructura" ? (
        <Estructura template={template} pages={pages} catalog={catalog} />
      ) : (
        <Tema template={template} />
      )}
    </div>
  );
}
