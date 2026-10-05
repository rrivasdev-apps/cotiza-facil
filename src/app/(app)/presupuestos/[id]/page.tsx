import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { DEFAULT_THEME, normalizeHeaderFooter, withFieldStyleDefaults } from "@/lib/types";
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
import { HelpButton } from "@/components/help-button";

const HELP_STEPS = [
  "Esto es una vista previa: así se va a ver el PDF que le llega a tu cliente.",
  "Si algo está mal, toca \"Editar presupuesto\" arriba para corregirlo.",
  "Toca \"Exportar PDF\" para generar el archivo — se abre en una pestaña nueva para que lo revises.",
  "Si ya exportaste uno antes, \"Ver último PDF\" te lo vuelve a abrir sin generarlo de nuevo.",
  "El botón verde \"Enviar a...\" le manda el PDF por correo a tu cliente, como archivo adjunto.",
  "\"Enviar con diseño (HTML)\" manda el mismo presupuesto, pero con un correo más vistoso en vez de texto simple.",
];

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
    header: normalizeHeaderFooter(template.header),
    footer: normalizeHeaderFooter(template.footer),
  };

  const { data: catalogFields } = await supabase.from("field_catalog").select("*");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 816, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <Link
          href={`/presupuestos/${presupuesto.id}/editar`}
          style={{
            background: "transparent",
            color: "var(--ink-dim)",
            border: "none",
            borderRadius: 8,
            padding: "0.6rem 1.25rem",
            fontWeight: 600,
            boxShadow: "var(--sh-soft)",
          }}
        >
          Editar presupuesto
        </Link>
        <HelpButton title="Cómo usar esta vista previa" steps={HELP_STEPS} />
      </div>
      <PresupuestoPreview
        presupuesto={presupuesto as Presupuesto}
        template={templateWithDefaults}
        pages={pagesWithSections}
        catalogFields={(catalogFields ?? []) as FieldCatalogEntry[]}
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
