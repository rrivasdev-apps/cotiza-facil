"use client";

import { useState, useTransition } from "react";
import { renameTemplate } from "@/lib/templates/actions";
import type { FieldCatalogEntry, PageWithSections, Template } from "@/lib/types";
import { Estructura } from "./estructura";
import { Tema } from "./tema";

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
          }}
        />
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
