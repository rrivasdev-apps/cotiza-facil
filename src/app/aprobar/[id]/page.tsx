import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_HEADER_FOOTER, DEFAULT_THEME, withFieldStyleDefaults } from "@/lib/types";
import type { FieldCatalogEntry, PageWithSections, Presupuesto, Template, TemplateSectionField } from "@/lib/types";
import { PresupuestoPreview } from "@/app/(app)/presupuestos/[id]/presupuesto-preview";
import { AprobarButton } from "./aprobar-button";

// Página pública (sin login) — es el link que recibe el cliente por
// correo. Usa el service role porque no hay sesión/cuenta que
// verificar vía RLS; ver src/lib/presupuestos/public-actions.ts para
// la acción que sí hace el cambio de estado.
export default async function AprobarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: presupuesto } = await admin.from("presupuestos").select("*").eq("id", id).single();
  if (!presupuesto) notFound();

  const { data: template } = await admin.from("templates").select("*").eq("id", presupuesto.template_id).single();
  if (!template) notFound();

  const { data: pages } = await admin
    .from("template_pages")
    .select("*")
    .eq("template_id", template.id)
    .order("order_index");

  const { data: sections } = await admin
    .from("template_sections")
    .select("*")
    .eq("template_id", template.id)
    .order("order_index");

  const { data: sectionFields } = await admin
    .from("template_section_fields")
    .select("*, field:field_catalog!template_section_fields_field_catalog_id_fkey(*)")
    .in("section_id", (sections ?? []).map((s) => s.id))
    .order("order_index");

  const sectionsWithFields = (sections ?? []).map((section) => ({
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
    header: { ...DEFAULT_HEADER_FOOTER, ...(template.header ?? {}) },
    footer: { ...DEFAULT_HEADER_FOOTER, ...(template.footer ?? {}) },
  };

  // Client admin, sin RLS — hay que filtrar por cuenta a mano.
  const { data: catalogFields } = await admin.from("field_catalog").select("*").eq("account_id", template.account_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 816, margin: "2rem auto", padding: "0 1rem" }}>
      <PresupuestoPreview
        presupuesto={presupuesto as Presupuesto}
        template={templateWithDefaults}
        pages={pagesWithSections}
        catalogFields={(catalogFields ?? []) as FieldCatalogEntry[]}
        hideBackLink
      />
      <AprobarButton
        presupuestoId={presupuesto.id}
        status={presupuesto.status}
        approvedAt={presupuesto.approved_at}
      />
    </div>
  );
}
