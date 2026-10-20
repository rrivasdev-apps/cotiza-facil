import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { DEFAULT_THEME, normalizeHeaderFooter, withFieldStyleDefaults } from "@/lib/types";
import type {
  FieldCatalogEntry,
  PageWithSections,
  SectionWithFields,
  Template,
  TemplateSectionField,
} from "@/lib/types";
import { TemplateEditor } from "./template-editor";

// addTemplateToGallery (ver add-to-gallery-button.tsx) lanza Chromium
// después de varias consultas a la BD, y puede superar el límite por
// defecto de Vercel (10s) — un Server Action hereda el maxDuration de
// la PÁGINA donde se usa, no del archivo donde está definida la acción
// (gallery-admin.ts), así que tiene que declararse acá.
export const maxDuration = 60;

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (!template) notFound();

  const { data: pages } = await supabase
    .from("template_pages")
    .select("*")
    .eq("template_id", id)
    .order("order_index");

  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .eq("template_id", id)
    .order("order_index");

  const { data: sectionFields } = await supabase
    .from("template_section_fields")
    .select("*, field:field_catalog!template_section_fields_field_catalog_id_fkey(*)")
    .in("section_id", (sections ?? []).map((s) => s.id))
    .order("order_index");

  const { data: catalog } = await supabase
    .from("field_catalog")
    .select("*")
    .order("name");

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
    <TemplateEditor
      template={templateWithDefaults}
      pages={pagesWithSections}
      catalog={(catalog ?? []) as FieldCatalogEntry[]}
      isPlatformAdmin={account?.isPlatformAdmin ?? false}
    />
  );
}
