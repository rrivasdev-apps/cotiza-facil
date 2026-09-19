import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_HEADER_FOOTER, DEFAULT_THEME } from "@/lib/types";
import type {
  FieldCatalogEntry,
  PageWithSections,
  SectionWithFields,
  Template,
  TemplateSectionField,
} from "@/lib/types";
import { TemplateEditor } from "./template-editor";

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

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
    .select("*, field:field_catalog(*)")
    .in("section_id", (sections ?? []).map((s) => s.id))
    .order("order_index");

  const { data: catalog } = await supabase
    .from("field_catalog")
    .select("*")
    .order("name");

  const sectionsWithFields: SectionWithFields[] = (sections ?? []).map((section) => ({
    ...section,
    fields: (sectionFields ?? []).filter(
      (sf) => sf.section_id === section.id,
    ) as (TemplateSectionField & { field: FieldCatalogEntry })[],
  }));

  const pagesWithSections: PageWithSections[] = (pages ?? []).map((page) => ({
    ...page,
    sections: sectionsWithFields.filter((s) => s.page_id === page.id),
  }));

  const templateWithDefaults: Template = {
    ...template,
    theme: { ...DEFAULT_THEME, ...(template.theme ?? {}) },
    header: { ...DEFAULT_HEADER_FOOTER, ...(template.header ?? {}) },
    footer: { ...DEFAULT_HEADER_FOOTER, ...(template.footer ?? {}) },
  };

  return (
    <TemplateEditor
      template={templateWithDefaults}
      pages={pagesWithSections}
      catalog={(catalog ?? []) as FieldCatalogEntry[]}
    />
  );
}
