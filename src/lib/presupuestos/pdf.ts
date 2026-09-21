import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import { DEFAULT_HEADER_FOOTER, DEFAULT_THEME, withFieldStyleDefaults } from "@/lib/types";
import type {
  FieldCatalogEntry,
  PageWithSections,
  Presupuesto,
  Template,
  TemplateSectionField,
} from "@/lib/types";
import { renderPresupuestoPdfHtml } from "@/lib/pdf/render-document";
import { htmlToPdf } from "@/lib/pdf/generate";

export class PdfGenerationError extends Error {}

// Genera el PDF del presupuesto y lo sube al bucket privado. Usado tanto
// por la ruta de "Exportar PDF" como por el envío por correo, para no
// duplicar la lógica de lectura + render + upload.
//
// Autorización: la lectura del presupuesto usa el cliente con RLS del
// usuario autenticado — si no es de su cuenta, vuelve null acá y se
// corta. El resto (storage, update de pdf_path) usa el cliente admin.
export async function generateAndStorePresupuestoPdf(presupuestoId: string) {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new PdfGenerationError("No autenticado.");

  const { data: presupuesto } = await supabase
    .from("presupuestos")
    .select("*")
    .eq("id", presupuestoId)
    .single();
  if (!presupuesto) throw new PdfGenerationError("Presupuesto no encontrado.");

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", presupuesto.template_id)
    .single();
  if (!template) throw new PdfGenerationError("Plantilla no encontrada.");

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
    header: { ...DEFAULT_HEADER_FOOTER, ...(template.header ?? {}) },
    footer: { ...DEFAULT_HEADER_FOOTER, ...(template.footer ?? {}) },
  };

  const html = renderPresupuestoPdfHtml(presupuesto as Presupuesto, templateWithDefaults, pagesWithSections);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await htmlToPdf(html);
  } catch (error) {
    console.error("Fallo generando el PDF:", error);
    throw new PdfGenerationError("No se pudo generar el PDF.");
  }

  const admin = createAdminClient();
  const path = `${account.accountId}/${presupuesto.id}.pdf`;

  const { error: uploadError } = await admin.storage
    .from("presupuestos-pdf")
    .upload(path, pdfBuffer, { upsert: true, contentType: "application/pdf" });
  if (uploadError) {
    console.error("Fallo subiendo el PDF:", uploadError);
    throw new PdfGenerationError("No se pudo guardar el PDF.");
  }

  const { error: updateError } = await supabase
    .from("presupuestos")
    .update({ pdf_path: path })
    .eq("id", presupuesto.id);
  if (updateError) throw new PdfGenerationError("PDF generado, pero no se pudo actualizar el presupuesto.");

  return {
    path,
    pdfBuffer,
    presupuesto: presupuesto as Presupuesto,
    template: templateWithDefaults,
  };
}

export async function createPresupuestoPdfSignedUrl(path: string, ttlSeconds: number): Promise<string> {
  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage.from("presupuestos-pdf").createSignedUrl(path, ttlSeconds);
  if (error || !signed) throw new PdfGenerationError("No se pudo generar el link del PDF.");
  return signed.signedUrl;
}
