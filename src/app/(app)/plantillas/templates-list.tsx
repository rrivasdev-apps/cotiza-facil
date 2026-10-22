"use client";

import Link from "next/link";
import type { Template } from "@/lib/types";
import { ListToolbar, compareText, useListControls } from "@/components/list-toolbar";
import type { SortOption } from "@/components/list-toolbar";
import { TemplateActionsMenu } from "./template-actions-menu";

const SORT_OPTIONS: SortOption<Template>[] = [
  {
    key: "fecha",
    label: "Última modificación",
    defaultDir: "desc",
    compare: (a, b) => a.updated_at.localeCompare(b.updated_at),
  },
  {
    key: "nombre",
    label: "Nombre",
    defaultDir: "asc",
    compare: (a, b) => compareText(a.name, b.name),
  },
];

const searchText = (template: Template) => template.name;

export function TemplatesList({
  templates,
  defaultTemplateId,
}: {
  templates: Template[];
  defaultTemplateId: string | null;
}) {
  const { visible, filtering, toolbarProps } = useListControls({
    items: templates,
    searchText,
    sortOptions: SORT_OPTIONS,
  });

  return (
    <>
      <ListToolbar {...toolbarProps} searchPlaceholder="Buscar plantilla…" />
      {visible.length === 0 && filtering && (
        <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem" }}>Ninguna plantilla coincide con la búsqueda.</p>
      )}
      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none" }}>
        {visible.map((template) => (
          <li
            key={template.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              rowGap: "0.5rem",
              background: "var(--card)",
              borderRadius: 12,
              boxShadow: "var(--sh-soft)",
            }}
          >
            <Link
              href={`/plantillas/${template.id}`}
              style={{
                flex: "1 1 200px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem 1.25rem",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{template.name}</span>
              {template.id === defaultTemplateId && (
                <span
                  title="Esta es la plantilla que se precarga al crear un presupuesto nuevo"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    borderRadius: 999,
                    padding: "0.2rem 0.6rem",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  ★ Predeterminada
                </span>
              )}
            </Link>
            <div style={{ paddingRight: "1rem" }}>
              <TemplateActionsMenu
                templateId={template.id}
                templateName={template.name}
                isDefault={template.id === defaultTemplateId}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
