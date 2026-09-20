import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_THEME } from "@/lib/types";
import type {
  FieldCatalogEntry,
  Presupuesto,
  TemplateSectionField,
  TemplateWithPages,
} from "@/lib/types";
import { EditPresupuestoForm } from "./edit-presupuesto-form";

export default async function EditarPresupuestoPage({
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

  const { data: pages } = await supabase
    .from("template_pages")
    .select("*")
    .eq("template_id", template.id)
    .order("order_index");

  const { data: sections } = await supabase
    .from("template_sections")
    .select("*")
    .eq("template_id", template.id)
    .order("order_index");

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: sectionFields } = await supabase
    .from("template_section_fields")
    .select("*, field:field_catalog(*)")
    .in("section_id", sectionIds.length > 0 ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");

  const templateWithPages: TemplateWithPages = {
    ...template,
    theme: { ...DEFAULT_THEME, ...(template.theme ?? {}) },
    pages: (pages ?? []).map((page) => ({
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
  };

  return <EditPresupuestoForm presupuesto={presupuesto as Presupuesto} template={templateWithPages} />;
}
