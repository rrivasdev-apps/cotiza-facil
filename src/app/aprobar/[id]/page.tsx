import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_THEME, normalizeHeaderFooter, withFieldStyleDefaults } from "@/lib/types";
import type { FieldCatalogEntry, PageWithSections, Presupuesto, Template, TemplateSectionField } from "@/lib/types";
import { PresupuestoPreview } from "@/app/(app)/presupuestos/[id]/presupuesto-preview";
import { APPROVAL_LINK_EXPIRED_MESSAGE, isApprovalLinkExpired } from "@/lib/presupuestos/approval-link";
import { AprobarButton } from "./aprobar-button";

// La vista previa del enlace (WhatsApp, correo) sale de acá; la imagen la
// pone opengraph-image.tsx. noindex: son enlaces privados de un cliente.
// No se revela nada del presupuesto si el enlace venció.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: presupuesto } = await admin
    .from("presupuestos")
    .select("number, status, approval_expires_at, template_id")
    .eq("id", id)
    .single();
  const robots = { index: false, follow: false };
  if (!presupuesto || isApprovalLinkExpired(presupuesto.status, presupuesto.approval_expires_at)) {
    return { title: "Presupuesto", robots };
  }

  const { data: template } = await admin.from("templates").select("name").eq("id", presupuesto.template_id).single();
  const base = presupuesto.number ? `Presupuesto N° ${presupuesto.number}` : "Presupuesto";
  const title = template?.name ? `${base} · ${template.name}` : base;
  const description = "Revisa el detalle y aprueba o rechaza tu presupuesto.";
  return { title, description, robots, openGraph: { title, description } };
}

// Página pública (sin login) — es el link que recibe el cliente por
// correo. Usa el service role porque no hay sesión/cuenta que
// verificar vía RLS; ver src/lib/presupuestos/public-actions.ts para
// la acción que sí hace el cambio de estado.
export default async function AprobarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: presupuesto } = await admin.from("presupuestos").select("*").eq("id", id).single();
  if (!presupuesto) notFound();

  if (isApprovalLinkExpired(presupuesto.status, presupuesto.approval_expires_at)) {
    return (
      <div style={{ width: "100%", maxWidth: 520, margin: "4rem auto", padding: "0 1rem" }}>
        <div
          style={{
            background: "var(--card)",
            borderRadius: 12,
            boxShadow: "var(--sh-soft)",
            padding: "1.5rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>Enlace vencido</p>
          <p style={{ color: "var(--ink-dim)" }}>{APPROVAL_LINK_EXPIRED_MESSAGE}</p>
        </div>
      </div>
    );
  }

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
    header: normalizeHeaderFooter(template.header),
    footer: normalizeHeaderFooter(template.footer),
  };

  // Client admin, sin RLS — hay que filtrar por cuenta a mano.
  const { data: catalogFields } = await admin.from("field_catalog").select("*").eq("account_id", template.account_id);

  return (
    // width: 100% es necesario: el body es flex en columna y con
    // margin auto el contenedor se encoge al ancho de su contenido
    // (816px), así ScaledPage nunca ve que el teléfono es más angosto.
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: 816, margin: "2rem auto", padding: "0 1rem" }}>
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
        rejectedAt={presupuesto.rejected_at}
      />
    </div>
  );
}
