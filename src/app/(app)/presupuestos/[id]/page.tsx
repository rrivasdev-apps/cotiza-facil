import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_THEME } from "@/lib/types";
import type { FieldCatalogEntry, Presupuesto, SectionWithFields, Template, TemplateSectionField } from "@/lib/types";
import { PresupuestoPreview } from "./presupuesto-preview";

export default async function PresupuestoPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: presupuesto } = await supabase.from("presupuestos").select("*").eq("id", id).single();
  if (!presupuesto) notFound();

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", presupuesto.template_id)
    .single();
  if (!template) notFound();

  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .eq("template_id", template.id)
    .order("order_index");

  const { data: sectionFields } = await supabase
    .from("template_section_fields")
    .select("*, field:field_catalog(*)")
    .in("section_id", (sections ?? []).map((s) => s.id))
    .order("order_index");

  const sectionsWithFields: SectionWithFields[] = (sections ?? []).map((section) => ({
    ...section,
    fields: (sectionFields ?? []).filter(
      (sf) => sf.section_id === section.id,
    ) as (TemplateSectionField & { field: FieldCatalogEntry })[],
  }));

  const templateWithTheme: Template = {
    ...template,
    theme: { ...DEFAULT_THEME, ...(template.theme ?? {}) },
  };

  return (
    <PresupuestoPreview
      presupuesto={presupuesto as Presupuesto}
      template={templateWithTheme}
      sections={sectionsWithFields}
    />
  );
}
