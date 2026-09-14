import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Template } from "@/lib/types";
import { NewTemplateForm } from "./new-template-form";

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
          <li key={template.id}>
            <Link
              href={`/plantillas/${template.id}`}
              style={{
                display: "block",
                background: "var(--card)",
                borderRadius: 12,
                boxShadow: "var(--sh-soft)",
                padding: "1rem 1.25rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>{template.name}</span>
            </Link>
          </li>
        ))}
        {templates?.length === 0 && (
          <p style={{ color: "var(--ink-dim)" }}>Todavía no hay plantillas.</p>
        )}
      </ul>
    </div>
  );
}
