import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_THEME } from "@/lib/types";
import type {
  FieldCatalogEntry,
  TemplateSectionField,
  TemplateWithSections,
} from "@/lib/types";
import { NewPresupuestoForm } from "./new-presupuesto-form";

export default async function NewPresupuestoPage() {
  const supabase = await createClient();

  const { data: templates } = await supabase.from("templates").select("*").order("name");
  const templateIds = (templates ?? []).map((t) => t.id);

  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .in("template_id", templateIds.length > 0 ? templateIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: sectionFields } = await supabase
    .from("template_section_fields")
    .select("*, field:field_catalog(*)")
    .in("section_id", sectionIds.length > 0 ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");

  const templatesWithSections: TemplateWithSections[] = (templates ?? []).map((template) => ({
    ...template,
    theme: { ...DEFAULT_THEME, ...(template.theme ?? {}) },
    sections: (sections ?? [])
      .filter((s) => s.template_id === template.id)
      .map((section) => ({
        ...section,
        fields: (sectionFields ?? []).filter(
          (sf) => sf.section_id === section.id,
        ) as (TemplateSectionField & { field: FieldCatalogEntry })[],
      })),
  }));

  if (templatesWithSections.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 480 }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Nuevo presupuesto</h1>
        <p style={{ color: "var(--ink-dim)" }}>
          Todavía no hay plantillas.{" "}
          <Link href="/plantillas" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Creá una primero.
          </Link>
        </p>
      </div>
    );
  }

  return <NewPresupuestoForm templates={templatesWithSections} />;
}
