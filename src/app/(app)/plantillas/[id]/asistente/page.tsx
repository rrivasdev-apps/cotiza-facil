import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerPage } from "@/lib/auth-guards";
import { DEFAULT_THEME, normalizeHeaderFooter, withFieldStyleDefaults } from "@/lib/types";
import type {
  FieldCatalogEntry,
  PageWithSections,
  SectionWithFields,
  Template,
  TemplateSectionField,
} from "@/lib/types";
import { readWizardDraft } from "@/lib/templates/wizard";
import { Asistente } from "./asistente";

// La vista previa renderiza HTML en el servidor igual que el editor.
export const maxDuration = 60;

// Mismas consultas que la página del editor ([id]/page.tsx): el asistente
// edita la misma plantilla, solo que con otra pantalla.
export default async function AsistentePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwnerPage();
  const { id } = await params;
  const supabase = await createClient();

  const { data: template } = await supabase.from("templates").select("*").eq("id", id).single();
  if (!template) notFound();

  const { data: pages } = await supabase.from("template_pages").select("*").eq("template_id", id).order("order_index");
  const { data: sections } = await supabase.from("template_sections").select("*").eq("template_id", id).order("order_index");
  const { data: sectionFields } = await supabase
    .from("template_section_fields")
    .select("*, field:field_catalog!template_section_fields_field_catalog_id_fkey(*)")
    .in("section_id", (sections ?? []).map((s) => s.id))
    .order("order_index");
  const { data: catalog } = await supabase.from("field_catalog").select("*").order("name");

  const sectionsWithFields: SectionWithFields[] = (sections ?? []).map((section) => ({
    ...section,
    fields: (sectionFields ?? [])
      .filter((sf) => sf.section_id === section.id)
      .map(withFieldStyleDefaults) as (TemplateSectionField & { field: FieldCatalogEntry })[],
  }));
  const pagesWithSections: PageWithSections[] = (pages ?? []).map((page) => ({
    ...page,
    sections: sectionsWithFields.filter((s) => s.page_id === page.id),
  }));

  const templateWithDefaults: Template = {
    ...template,
    theme: { ...DEFAULT_THEME, ...(template.theme ?? {}) },
    header: normalizeHeaderFooter(template.header),
    footer: normalizeHeaderFooter(template.footer),
  };

  return (
    <Asistente
      template={templateWithDefaults}
      pages={pagesWithSections}
      catalog={(catalog ?? []) as FieldCatalogEntry[]}
      initialDraft={readWizardDraft(templateWithDefaults, pagesWithSections)}
    />
  );
}
