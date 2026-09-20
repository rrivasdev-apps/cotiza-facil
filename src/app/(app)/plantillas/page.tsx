import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Template } from "@/lib/types";
import { NewTemplateForm } from "./new-template-form";
import { duplicateTemplate } from "@/lib/templates/actions";
import { DeleteTemplateButton } from "./delete-template-button";

export default async function PlantillasPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Plantillas</h1>
      </div>

      <NewTemplateForm />

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none" }}>
        {((templates ?? []) as Template[]).map((template) => (
          <li
            key={template.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--card)",
              borderRadius: 12,
              boxShadow: "var(--sh-soft)",
            }}
          >
            <Link
              href={`/plantillas/${template.id}`}
              style={{ flex: 1, display: "block", padding: "1rem 1.25rem" }}
            >
              <span style={{ fontWeight: 600 }}>{template.name}</span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingRight: "1rem" }}>
              <form action={duplicateTemplate.bind(null, template.id)}>
                <button
                  type="submit"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--ink-dim)",
                    color: "var(--ink-dim)",
                    borderRadius: 8,
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Duplicar
                </button>
              </form>
              <DeleteTemplateButton templateId={template.id} templateName={template.name} />
            </div>
          </li>
        ))}
        {templates?.length === 0 && (
          <p style={{ color: "var(--ink-dim)" }}>Todavía no hay plantillas.</p>
        )}
      </ul>
    </div>
  );
}
