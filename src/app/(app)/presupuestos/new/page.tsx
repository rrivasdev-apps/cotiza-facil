import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { DEFAULT_THEME } from "@/lib/types";
import type {
  Cliente,
  FieldCatalogEntry,
  FieldSavedValue,
  ItemConceptValue,
  TemplateSectionField,
  TemplateWithPages,
} from "@/lib/types";
import { NewPresupuestoForm } from "./new-presupuesto-form";

export default async function NewPresupuestoPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  const { data: templates } = await supabase.from("templates").select("*").order("name");
  const templateIds = (templates ?? []).map((t) => t.id);

  const { data: pages } = await supabase
    .from("template_pages")
    .select("*")
    .in("template_id", templateIds.length > 0 ? templateIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");

  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .in("template_id", templateIds.length > 0 ? templateIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: sectionFields } = await supabase
    .from("template_section_fields")
    .select("*, field:field_catalog!template_section_fields_field_catalog_id_fkey(*)")
    .in("section_id", sectionIds.length > 0 ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");

  const templatesWithPages: TemplateWithPages[] = (templates ?? []).map((template) => ({
    ...template,
    theme: { ...DEFAULT_THEME, ...(template.theme ?? {}) },
    pages: (pages ?? [])
      .filter((p) => p.template_id === template.id)
      .map((page) => ({
        ...page,
        sections: (sections ?? [])
          .filter((s) => s.page_id === page.id)
          .map((section) => ({
            ...section,
            fields: (sectionFields ?? []).filter(
              (sf) => sf.section_id === section.id,
            ) as (TemplateSectionField & { field: FieldCatalogEntry })[],
          })),
      })),
  }));

  if (templatesWithPages.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Nuevo presupuesto</h1>
        <p style={{ color: "var(--ink-dim)" }}>
          Todavía no hay plantillas.{" "}
          <Link href="/plantillas" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Crea una primero.
          </Link>
        </p>
      </div>
    );
  }

  const { data: savedValues } = await supabase
    .from("field_saved_values")
    .select("*")
    .order("value");
  const savedValuesByField: Record<string, FieldSavedValue[]> = {};
  for (const sv of (savedValues ?? []) as FieldSavedValue[]) {
    (savedValuesByField[sv.field_catalog_id] ??= []).push(sv);
  }

  const { data: savedConcepts } = await supabase
    .from("item_concept_values")
    .select("*")
    .order("value");

  const { data: clientes } = await supabase.from("clientes").select("*").order("name");

  return (
    <NewPresupuestoForm
      templates={templatesWithPages}
      savedValuesByField={savedValuesByField}
      savedConcepts={(savedConcepts ?? []) as ItemConceptValue[]}
      clientes={(clientes ?? []) as Cliente[]}
      defaultTemplateId={account?.defaultTemplateId ?? null}
    />
  );
}
