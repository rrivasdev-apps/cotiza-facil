import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { DEFAULT_HEADER_FOOTER, DEFAULT_THEME, withFieldStyleDefaults } from "@/lib/types";
import type {
  FieldCatalogEntry,
  PageWithSections,
  Presupuesto,
  Template,
  TemplateSectionField,
} from "@/lib/types";
import { PresupuestoPreview } from "./presupuesto-preview";
import { ExportPdfButton } from "./export-pdf-button";
import { isEmailConfigured } from "@/lib/email/resend";

export default async function PresupuestoPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

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

  const { data: sectionFields } = await supabase
    .from("template_section_fields")
    .select("*, field:field_catalog(*)")
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PresupuestoPreview
        presupuesto={presupuesto as Presupuesto}
        template={templateWithDefaults}
        pages={pagesWithSections}
      />
      <ExportPdfButton
        presupuestoId={presupuesto.id}
        hasPdf={Boolean(presupuesto.pdf_path)}
        clientEmail={presupuesto.client_email}
        emailConfigured={isEmailConfigured(account?.senderEmail ?? null)}
        hasSenderEmail={Boolean(account?.senderEmail)}
      />
    </div>
  );
}
