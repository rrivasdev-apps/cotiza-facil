"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import { ID_TOKEN_RE } from "@/lib/composite-template";
import { isSectionTotalFieldId, sectionIdFromTotalFieldId, sectionTotalFieldId } from "@/lib/presupuesto-items";
import { setDefaultTemplateIfUnset } from "@/lib/templates/actions";

async function requireAccount() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
}

// Envía una plantilla propia a otra cuenta, identificada por el correo
// de uno de sus usuarios — queda "pendiente" hasta que esa cuenta la
// acepte o la rechace (ver acceptTemplateShare/rejectTemplateShare).
// No copia nada todavía: eso solo pasa al aceptar.
export async function sendTemplateShare(templateId: string, recipientEmailRaw: string) {
  const { supabase, account } = await requireAccount();
  const recipientEmail = recipientEmailRaw.trim().toLowerCase();
  if (!recipientEmail) throw new Error("Escribe un correo.");

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("id, name")
    .eq("id", templateId)
    .single();
  if (templateError || !template) throw new Error("Plantilla no encontrada.");

  // Solo el service role puede resolver un correo contra la cuenta a
  // la que pertenece — RLS en `users` solo deja ver los de la propia
  // cuenta, y acá necesitamos buscar en cualquiera.
  const admin = createAdminClient();
  const { data: recipientUser } = await admin
    .from("users")
    .select("account_id")
    .eq("email", recipientEmail)
    .maybeSingle();
  if (!recipientUser) throw new Error("No existe ninguna cuenta con ese correo.");
  if (recipientUser.account_id === account.accountId) {
    throw new Error("No puedes enviarte una plantilla a ti mismo.");
  }

  const { data: existingPending } = await supabase
    .from("template_shares")
    .select("id")
    .eq("source_template_id", templateId)
    .eq("recipient_account_id", recipientUser.account_id)
    .eq("status", "pendiente")
    .maybeSingle();
  if (existingPending) throw new Error("Ya le enviaste esta plantilla y está pendiente de respuesta.");

  const { error } = await supabase.from("template_shares").insert({
    sender_account_id: account.accountId,
    sender_account_name: account.accountName,
    recipient_account_id: recipientUser.account_id,
    recipient_email: recipientEmail,
    source_template_id: templateId,
    source_template_name: template.name,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/plantillas");
}

export async function rejectTemplateShare(shareId: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase
    .from("template_shares")
    .update({ status: "rechazada", resolved_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("status", "pendiente");
  if (error) throw new Error(error.message);
  revalidatePath("/plantillas");
}

// Acepta una plantilla compartida: genera una copia completa e
// independiente (páginas, secciones, campos) asociada a la cuenta
// receptora. Mismo mecanismo que duplicateTemplate para clonar la
// estructura, combinado con el de createTemplateFromGallery para el
// catálogo — acá el catálogo de origen es el de OTRA cuenta, así que
// nunca se puede copiar un field_catalog_id tal cual: por cada campo
// referenciado (directo, "valor en letras", línea combinada o
// fórmula) se busca un campo con el mismo nombre y tipo de dato en el
// catálogo de la cuenta receptora y se reusa; si no existe, se crea.
export async function acceptTemplateShare(shareId: string) {
  const { supabase, account } = await requireAccount();

  // RLS ya garantiza que esta fila es para esta cuenta — si no,
  // share sale null y se corta acá.
  const { data: share, error: shareError } = await supabase
    .from("template_shares")
    .select("*")
    .eq("id", shareId)
    .eq("status", "pendiente")
    .single();
  if (shareError || !share) throw new Error("Esa plantilla compartida no existe o ya fue resuelta.");
  if (!share.source_template_id) throw new Error("La plantilla original ya no existe.");

  const admin = createAdminClient();

  const { data: sourceTemplate } = await admin
    .from("templates")
    .select("*")
    .eq("id", share.source_template_id)
    .single();
  if (!sourceTemplate) throw new Error("La plantilla original ya no existe.");

  const { data: sourcePages } = await admin
    .from("template_pages")
    .select("*")
    .eq("template_id", sourceTemplate.id)
    .order("order_index");

  const { data: sourceSections } = await admin
    .from("template_sections")
    .select("*")
    .eq("template_id", sourceTemplate.id)
    .order("order_index");

  const sourceSectionIds = (sourceSections ?? []).map((s) => s.id);
  const { data: sourceFields } = await admin
    .from("template_section_fields")
    .select("*")
    .in("section_id", sourceSectionIds.length > 0 ? sourceSectionIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");

  // 1. Resolver cada field_catalog_id real referenciado (directo,
  //    number_in_words_of, o embebido en composite_template/formula)
  //    contra el catálogo de la cuenta receptora.
  const referencedCatalogIds = new Set<string>();
  const collectFromTokens = (text: string | null) => {
    if (!text) return;
    for (const match of text.matchAll(ID_TOKEN_RE)) {
      const id = match[1];
      if (!isSectionTotalFieldId(id)) referencedCatalogIds.add(id);
    }
  };
  for (const sf of sourceFields ?? []) {
    if (sf.field_catalog_id) referencedCatalogIds.add(sf.field_catalog_id);
    if (sf.number_in_words_of && !isSectionTotalFieldId(sf.number_in_words_of)) {
      referencedCatalogIds.add(sf.number_in_words_of);
    }
    collectFromTokens(sf.composite_template);
    collectFromTokens(sf.formula);
  }
  if (sourceTemplate.total_field_id && !isSectionTotalFieldId(sourceTemplate.total_field_id)) {
    referencedCatalogIds.add(sourceTemplate.total_field_id);
  }

  const catalogIdMap = new Map<string, string>();
  if (referencedCatalogIds.size > 0) {
    const { data: sourceCatalogFields } = await admin
      .from("field_catalog")
      .select("id, name, data_type")
      .in("id", [...referencedCatalogIds]);

    const { data: recipientCatalog } = await supabase.from("field_catalog").select("id, name, data_type");
    const recipientByName = new Map<string, { id: string; data_type: string }>();
    for (const f of recipientCatalog ?? []) {
      if (!recipientByName.has(f.name)) recipientByName.set(f.name, { id: f.id, data_type: f.data_type });
    }

    for (const f of sourceCatalogFields ?? []) {
      const match = recipientByName.get(f.name);
      if (match && match.data_type === f.data_type) {
        catalogIdMap.set(f.id, match.id);
        continue;
      }
      const { data: newField, error: newFieldError } = await supabase
        .from("field_catalog")
        .insert({ account_id: account.accountId, name: f.name, data_type: f.data_type })
        .select("id")
        .single();
      if (newFieldError || !newField) {
        throw new Error(newFieldError?.message ?? "No se pudo crear un campo del catálogo.");
      }
      catalogIdMap.set(f.id, newField.id);
      // Por si la plantilla origen repite el mismo nombre en más de un
      // campo — que el segundo también lo encuentre ya resuelto.
      recipientByName.set(f.name, { id: newField.id, data_type: f.data_type });
    }
  }

  // 2. Clonar plantilla + páginas + secciones, mapeando ids viejos ->
  //    nuevos (igual que duplicateTemplate).
  const { data: newTemplate, error: newTemplateError } = await supabase
    .from("templates")
    .insert({
      account_id: account.accountId,
      name: sourceTemplate.name,
      theme: sourceTemplate.theme,
      header: sourceTemplate.header,
      footer: sourceTemplate.footer,
    })
    .select("id")
    .single();
  if (newTemplateError || !newTemplate) throw new Error(newTemplateError?.message ?? "No se pudo crear la plantilla.");

  const pageIdMap = new Map<string, string>();
  for (const page of sourcePages ?? []) {
    const { data: newPage, error } = await supabase
      .from("template_pages")
      .insert({
        account_id: account.accountId,
        template_id: newTemplate.id,
        order_index: page.order_index,
        title: page.title,
        show_header: page.show_header,
        show_footer: page.show_footer,
        body_align_h: page.body_align_h,
        body_align_v: page.body_align_v,
      })
      .select("id")
      .single();
    if (error || !newPage) throw new Error(error?.message ?? "No se pudo copiar una página.");
    pageIdMap.set(page.id, newPage.id);
  }

  const sectionIdMap = new Map<string, string>();
  for (const section of sourceSections ?? []) {
    const { data: newSection, error } = await supabase
      .from("template_sections")
      .insert({
        account_id: account.accountId,
        template_id: newTemplate.id,
        page_id: pageIdMap.get(section.page_id),
        type: section.type,
        title: section.title,
        order_index: section.order_index,
        config: section.config,
      })
      .select("id")
      .single();
    if (error || !newSection) throw new Error(error?.message ?? "No se pudo copiar una sección.");
    sectionIdMap.set(section.id, newSection.id);
  }

  // 3. Ahora que los mapas de sección y catálogo están completos,
  //    remapear cualquier id embebido (de catálogo, o "section-total:
  //    <id>" sintético de un Total General de tabla_items).
  function remapId(oldId: string): string {
    if (isSectionTotalFieldId(oldId)) {
      const newSectionId = sectionIdMap.get(sectionIdFromTotalFieldId(oldId));
      if (!newSectionId) throw new Error("Referencia a una sección que no se pudo copiar.");
      return sectionTotalFieldId(newSectionId);
    }
    const mapped = catalogIdMap.get(oldId);
    if (!mapped) throw new Error("Referencia a un campo que no se pudo copiar.");
    return mapped;
  }

  function remapTokens(text: string | null): string | null {
    if (!text) return text;
    return text.replace(ID_TOKEN_RE, (_m, id: string) => `{{id:${remapId(id)}}}`);
  }

  if (sourceFields && sourceFields.length > 0) {
    const { error } = await supabase.from("template_section_fields").insert(
      sourceFields.map((sf) => ({
        account_id: account.accountId,
        section_id: sectionIdMap.get(sf.section_id),
        field_catalog_id: sf.field_catalog_id ? remapId(sf.field_catalog_id) : null,
        order_index: sf.order_index,
        required: sf.required,
        label_style: sf.label_style,
        value_style: sf.value_style,
        number_in_words_of: sf.number_in_words_of ? remapId(sf.number_in_words_of) : null,
        number_in_words_include_amount: sf.number_in_words_include_amount,
        visible: sf.visible,
        composite_template: remapTokens(sf.composite_template),
        formula: remapTokens(sf.formula),
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (sourceTemplate.total_field_id) {
    const { error } = await supabase
      .from("templates")
      .update({ total_field_id: remapId(sourceTemplate.total_field_id) })
      .eq("id", newTemplate.id);
    if (error) throw new Error(error.message);
  }

  // 4. Marcar la invitación como aceptada, con el id de la copia recién creada.
  const { error: resolveError } = await supabase
    .from("template_shares")
    .update({ status: "aceptada", copied_template_id: newTemplate.id, resolved_at: new Date().toISOString() })
    .eq("id", shareId);
  if (resolveError) throw new Error(resolveError.message);

  await setDefaultTemplateIfUnset(supabase, account.accountId, newTemplate.id);

  revalidatePath("/plantillas");
  redirect(`/plantillas/${newTemplate.id}`);
}
