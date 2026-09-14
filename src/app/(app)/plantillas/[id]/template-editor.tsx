"use client";

import { useState } from "react";
import type { FieldCatalogEntry, SectionWithFields, Template } from "@/lib/types";
import { Estructura } from "./estructura";
import { Tema } from "./tema";

export function TemplateEditor({
  template,
  sections,
  catalog,
}: {
  template: Template;
  sections: SectionWithFields[];
  catalog: FieldCatalogEntry[];
}) {
  const [tab, setTab] = useState<"estructura" | "tema">("estructura");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720 }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{template.name}</h1>

      <div
        style={{
          display: "inline-flex",
          background: "var(--card)",
          borderRadius: 999,
          boxShadow: "var(--sh-soft)",
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
              fontWeight: 600,
              cursor: "pointer",
              background: tab === t ? "var(--bg)" : "transparent",
              boxShadow: tab === t ? "var(--sh-1)" : "none",
              color: tab === t ? "var(--ink)" : "var(--ink-dim)",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "estructura" ? (
        <Estructura template={template} sections={sections} catalog={catalog} />
      ) : (
        <Tema template={template} />
      )}
    </div>
  );
}
