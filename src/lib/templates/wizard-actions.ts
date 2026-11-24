"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { DEFAULT_FIELD_STYLE, normalizeHeaderFooter, type TemplateTheme } from "@/lib/types";
import { uploadLogo } from "@/lib/templates/actions";
import { getAppUrl } from "@/lib/app-url";
import { defaultSenderEmail } from "@/lib/email/default-sender";
import { sendWizardLinkEmail } from "@/lib/email/resend";
import { wizardPath } from "@/lib/templates/wizard-link";
import {
  CONDITIONS_SECTION_TITLE,
  contactZones,
  SIGNATURE_LINE,
  SIGNATURE_SECTION_TITLE,
  SIGNER_NAME_STYLE,
  SIGNER_ROLE_STYLE,
  pickTextColor,
  sanitizeLineText,
  withLogoInHeader,
  withZoneText,
  type WizardCondition,
} from "@/lib/templates/wizard";

// Acciones del asistente de configuración inicial. Cada paso guarda al
// tocar "Continuar" (no tecla por tecla), y todas validan que quien
// llama sea propietario — RLS ya aísla por cuenta, esto da un error
// claro en vez de una escritura que "no hace nada".
// Se duplica el chequeo de actions.ts en vez de exportarlo: un archivo
// "use server" publica cada export como endpoint, y esa función no debe
// quedar expuesta.
async function requireOwner() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  if (!account.isOwner) throw new Error("Solo el propietario del workspace puede hacer esto.");
  return { supabase, account };
}

const MAX_TEXT = 200;
const MAX_CONDITION_TEXT = 300;
const MAX_CONDITIONS = 20;

function cleanText(value: string, max: number): string {
  return value.trim().slice(0, max);
}

async function loadTemplateRow(supabase: SupabaseClient, templateId: string) {
  const { data, error } = await supabase
    .from("templates")
    .select("id, theme, header, footer")
    .eq("id", templateId)
    .single();
  if (error || !data) throw new Error("No se encontró la plantilla.");
  return data;
}

// Páginas en orden — la última es donde se agrega lo nuevo (firma,
// condiciones), porque es lo que va al final del presupuesto.
async function loadPagesAndSections(supabase: SupabaseClient, templateId: string) {
  const [{ data: pages, error: pagesError }, { data: sections, error: sectionsError }] = await Promise.all([
    supabase.from("template_pages").select("id, order_index").eq("template_id", templateId).order("order_index"),
    supabase
      .from("template_sections")
      .select("id, page_id, type, title, order_index")
      .eq("template_id", templateId)
      .order("order_index"),
  ]);
  if (pagesError) throw new Error(pagesError.message);
  if (sectionsError) throw new Error(sectionsError.message);
  if (!pages || pages.length === 0) throw new Error("La plantilla no tiene páginas.");
  return { pages, sections: sections ?? [] };
}

export async function uploadWizardLogo(templateId: string, formData: FormData) {
  const { supabase } = await requireOwner();
  await uploadLogo(templateId, formData);

  const template = await loadTemplateRow(supabase, templateId);
  const header = normalizeHeaderFooter(template.header);
  const footer = normalizeHeaderFooter(template.footer);
  const nextHeader = withLogoInHeader(header, footer);
  if (nextHeader !== header) {
    const { error } = await supabase.from("templates").update({ header: nextHeader }).eq("id", templateId);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/plantillas/${templateId}`);
}

// bgColor null = conservar el fondo de la plantilla (no toca nada).
export async function saveWizardBackground(templateId: string, bgColor: string | null) {
  const { supabase } = await requireOwner();
  if (bgColor === null) return;
  if (!/^#[0-9a-fA-F]{6}$/.test(bgColor)) throw new Error("Color de fondo no válido.");

  const template = await loadTemplateRow(supabase, templateId);
  const theme: TemplateTheme = {
    ...(template.theme as TemplateTheme),
    bgColor,
    textColor: pickTextColor(bgColor),
    gradientFrom: null,
    gradientTo: null,
  };
  const { error } = await supabase.from("templates").update({ theme }).eq("id", templateId);
  if (error) throw new Error(error.message);

  // Un color propio de página manda sobre el del tema, y la imagen de
  // fondo se pinta encima del color: sin quitar ambos, el fondo elegido
  // no se vería. La imagen no se borra, solo se apaga por página, así
  // que se puede volver a prender en el editor.
  const { error: pagesError } = await supabase
    .from("template_pages")
    .update({ bg_color: null, text_color: null, show_background_image: false })
    .eq("template_id", templateId);
  if (pagesError) throw new Error(pagesError.message);

  revalidatePath(`/plantillas/${templateId}`);
}

export async function saveWizardContact(templateId: string, address: string, email: string) {
  const { supabase } = await requireOwner();
  const template = await loadTemplateRow(supabase, templateId);

  let footer = normalizeHeaderFooter(template.footer);
  const zones = contactZones(footer);
  footer = withZoneText(footer, zones.address, cleanText(address, MAX_TEXT));
  footer = withZoneText(footer, zones.email, cleanText(email, MAX_TEXT));

  const { error } = await supabase.from("templates").update({ footer }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function saveWizardSigner(templateId: string, signerName: string, role: string) {
  const { supabase, account } = await requireOwner();
  const signer = sanitizeLineText(cleanText(signerName, MAX_TEXT));
  const roleText = sanitizeLineText(cleanText(role, MAX_TEXT));
  // Sin nombre no se toca nada: la plantilla puede traer su propia firma.
  if (!signer) return;

  const { pages, sections } = await loadPagesAndSections(supabase, templateId);
  const existing = sections.find((s) => s.title.trim().toLowerCase() === SIGNATURE_SECTION_TITLE.toLowerCase());

  if (existing) {
    // Firma que ya trae la plantilla (o una que hizo el asistente antes):
    // se cambia el texto de sus líneas y se respeta su estilo.
    const { data: rows, error: rowsError } = await supabase
      .from("template_section_fields")
      .select("id, composite_template, order_index, value_style")
      .eq("section_id", existing.id)
      .is("field_catalog_id", null)
      .order("order_index");
    if (rowsError) throw new Error(rowsError.message);

    const textRows = (rows ?? []).filter((row) => row.composite_template !== null && row.composite_template !== SIGNATURE_LINE);
    const [nameRow, roleRow] = textRows;

    if (nameRow) {
      const { error } = await supabase.from("template_section_fields").update({ composite_template: signer }).eq("id", nameRow.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("template_section_fields").insert({
        account_id: account.accountId,
        section_id: existing.id,
        field_catalog_id: null,
        composite_template: signer,
        order_index: (rows ?? []).reduce((max, row) => Math.max(max, row.order_index), -1) + 1,
        required: false,
        label_style: DEFAULT_FIELD_STYLE,
        value_style: SIGNER_NAME_STYLE,
      });
      if (error) throw new Error(error.message);
    }

    if (roleText && roleRow) {
      const { error } = await supabase.from("template_section_fields").update({ composite_template: roleText }).eq("id", roleRow.id);
      if (error) throw new Error(error.message);
    } else if (roleText) {
      const { error } = await supabase.from("template_section_fields").insert({
        account_id: account.accountId,
        section_id: existing.id,
        field_catalog_id: null,
        composite_template: roleText,
        order_index: (rows ?? []).reduce((max, row) => Math.max(max, row.order_index), 0) + 1,
        required: false,
        label_style: DEFAULT_FIELD_STYLE,
        value_style: { ...(nameRow?.value_style ?? SIGNER_ROLE_STYLE), bold: false, fontSize: 14 },
      });
      if (error) throw new Error(error.message);
    }
    revalidatePath(`/plantillas/${templateId}`);
    return;
  }

  // La plantilla no tiene firma: se agrega una al final de la última página.
  const lastPage = pages[pages.length - 1];
  const countOnLastPage = sections.filter((s) => s.page_id === lastPage.id).length;
  const { data: created, error: createError } = await supabase
    .from("template_sections")
    .insert({
      account_id: account.accountId,
      template_id: templateId,
      page_id: lastPage.id,
      type: "cierre",
      title: SIGNATURE_SECTION_TITLE,
      order_index: countOnLastPage,
      config: {},
    })
    .select("id")
    .single();
  if (createError || !created) throw new Error(createError?.message ?? "No se pudo crear la firma.");

  const lines = [
    { text: SIGNATURE_LINE, style: DEFAULT_FIELD_STYLE },
    { text: signer, style: SIGNER_NAME_STYLE },
    ...(roleText ? [{ text: roleText, style: SIGNER_ROLE_STYLE }] : []),
  ];
  const { error: insertError } = await supabase.from("template_section_fields").insert(
    lines.map((line, index) => ({
      account_id: account.accountId,
      section_id: created.id,
      field_catalog_id: null,
      composite_template: line.text,
      order_index: index,
      required: false,
      label_style: DEFAULT_FIELD_STYLE,
      value_style: line.style,
    })),
  );
  if (insertError) throw new Error(insertError.message);
  revalidatePath(`/plantillas/${templateId}`);
}

// Devuelve las condiciones tal como quedaron en la base (ya con id),
// para que el asistente no vuelva a insertar como "nueva" una condición
// que acaba de guardar si la persona vuelve atrás y continúa otra vez.
export async function saveWizardConditions(templateId: string, conditions: WizardCondition[]): Promise<WizardCondition[]> {
  const { supabase, account } = await requireOwner();
  if (conditions.length > MAX_CONDITIONS) throw new Error(`Máximo ${MAX_CONDITIONS} condiciones.`);

  const { pages, sections } = await loadPagesAndSections(supabase, templateId);
  const pageOrder = new Map(pages.map((p) => [p.id, p.order_index]));
  const clausulas = sections
    .filter((s) => s.type === "clausulas")
    .sort((a, b) => (pageOrder.get(a.page_id) ?? 0) - (pageOrder.get(b.page_id) ?? 0) || a.order_index - b.order_index);

  let sectionId = clausulas[0]?.id;
  const cleaned = conditions.map((c) => ({ ...c, text: sanitizeLineText(cleanText(c.text, MAX_CONDITION_TEXT)) }));
  const additions = cleaned.filter((c) => c.id === null && c.text);

  if (!sectionId) {
    if (additions.length === 0) return [];
    const lastPage = pages[pages.length - 1];
    const countOnLastPage = sections.filter((s) => s.page_id === lastPage.id).length;
    const { data, error } = await supabase
      .from("template_sections")
      .insert({
        account_id: account.accountId,
        template_id: templateId,
        page_id: lastPage.id,
        type: "clausulas",
        title: CONDITIONS_SECTION_TITLE,
        order_index: countOnLastPage,
        config: {},
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "No se pudo crear la sección de condiciones.");
    sectionId = data.id;
  }

  // Solo se tocan filas que de verdad pertenecen a esta sección: un id
  // que llega del navegador no se confía.
  const { data: existingRows, error: rowsError } = await supabase
    .from("template_section_fields")
    .select("id, order_index")
    .eq("section_id", sectionId);
  if (rowsError) throw new Error(rowsError.message);
  const ownedIds = new Set((existingRows ?? []).map((row) => row.id));
  let nextOrder = (existingRows ?? []).reduce((max, row) => Math.max(max, row.order_index), -1) + 1;

  for (const condition of cleaned) {
    if (condition.id) {
      if (!ownedIds.has(condition.id)) continue;
      // Texto vacío = la persona la borró.
      const result = condition.text
        ? await supabase
            .from("template_section_fields")
            .update({ composite_template: condition.text, visible: condition.on })
            .eq("id", condition.id)
        : await supabase.from("template_section_fields").delete().eq("id", condition.id);
      if (result.error) throw new Error(result.error.message);
    } else if (condition.text) {
      const { error } = await supabase.from("template_section_fields").insert({
        account_id: account.accountId,
        section_id: sectionId,
        field_catalog_id: null,
        composite_template: condition.text,
        order_index: nextOrder++,
        required: false,
        label_style: DEFAULT_FIELD_STYLE,
        value_style: DEFAULT_FIELD_STYLE,
        visible: condition.on,
      });
      if (error) throw new Error(error.message);
    }
  }

  const { data: savedRows, error: savedError } = await supabase
    .from("template_section_fields")
    .select("id, composite_template, visible")
    .eq("section_id", sectionId)
    .is("field_catalog_id", null)
    .order("order_index");
  if (savedError) throw new Error(savedError.message);

  revalidatePath(`/plantillas/${templateId}`);
  return (savedRows ?? []).map((row) => ({ id: row.id, text: row.composite_template ?? "", on: row.visible }));
}

// Manda al correo de quien está conectado el enlace para seguir en el
// computador. Solo a su propio correo (nunca uno que llegue del
// navegador) y devuelve un mensaje en vez de lanzar, para que la
// pantalla lo muestre tal cual.
export async function sendWizardLink(templateId: string): Promise<{ ok: true } | { error: string }> {
  const { supabase, account } = await requireOwner();
  if (!account.userEmail) return { error: "Tu cuenta no tiene un correo para enviarte el enlace." };

  const { data: template } = await supabase.from("templates").select("name").eq("id", templateId).single();
  if (!template) return { error: "No se encontró la plantilla." };

  try {
    await sendWizardLinkEmail(
      account.userEmail,
      template.name,
      `${getAppUrl()}${wizardPath(templateId)}`,
      // Mismo remitente por defecto que el alta de una cuenta nueva.
      account.senderEmail ?? defaultSenderEmail(account.accountName),
    );
    return { ok: true };
  } catch (e) {
    console.error("No se pudo enviar el enlace del asistente:", e);
    return { error: "No pudimos enviar el correo. Inténtalo de nuevo en un momento." };
  }
}
