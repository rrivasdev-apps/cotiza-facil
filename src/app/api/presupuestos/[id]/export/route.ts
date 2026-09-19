import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import { DEFAULT_THEME } from "@/lib/types";
import type { FieldCatalogEntry, Presupuesto, SectionWithFields, Template, TemplateSectionField } from "@/lib/types";
import { renderPresupuestoPdfHtml } from "@/lib/pdf/render-document";
import { htmlToPdf } from "@/lib/pdf/generate";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // RLS scopes esta lectura a la propia cuenta — si el presupuesto es de
  // otra cuenta o no existe, esto vuelve null y devolvemos 404. Esa es la
  // única verificación de autorización que necesita este endpoint; el
  // resto de las operaciones (storage, update) usan el cliente admin.
  const { data: presupuesto } = await supabase
    .from("presupuestos")
    .select("*")
    .eq("id", id)
    .single();
  if (!presupuesto) {
    return NextResponse.json({ error: "Presupuesto no encontrado." }, { status: 404 });
  }

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", presupuesto.template_id)
    .single();
  if (!template) {
    return NextResponse.json({ error: "Plantilla no encontrada." }, { status: 404 });
  }

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

  const html = renderPresupuestoPdfHtml(presupuesto as Presupuesto, templateWithTheme, sectionsWithFields);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await htmlToPdf(html);
  } catch (error) {
    console.error("Fallo generando el PDF:", error);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }

  const admin = createAdminClient();
  const path = `${account.accountId}/${presupuesto.id}.pdf`;

  const { error: uploadError } = await admin.storage
    .from("presupuestos-pdf")
    .upload(path, pdfBuffer, { upsert: true, contentType: "application/pdf" });
  if (uploadError) {
    console.error("Fallo subiendo el PDF:", uploadError);
    return NextResponse.json({ error: "No se pudo guardar el PDF." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("presupuestos")
    .update({ pdf_path: path })
    .eq("id", presupuesto.id);
  if (updateError) {
    return NextResponse.json({ error: "PDF generado, pero no se pudo actualizar el presupuesto." }, { status: 500 });
  }

  const { data: signed, error: signError } = await admin.storage
    .from("presupuestos-pdf")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) {
    return NextResponse.json({ error: "PDF guardado, pero no se pudo generar el link." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
