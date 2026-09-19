"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import {
  DEFAULT_THEME,
  type AlignH,
  type AlignV,
  type DataType,
  type HeaderFooterConfig,
  type SectionType,
  type TemplateTheme,
} from "@/lib/types";

async function requireAccount() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
}

export async function createTemplate(_prevState: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "El nombre es obligatorio.";

  const { supabase, account } = await requireAccount();
  const { data, error } = await supabase
    .from("templates")
    .insert({ account_id: account.accountId, name, theme: DEFAULT_THEME })
    .select("id")
    .single();

  if (error) return `No se pudo crear la plantilla: ${error.message}`;

  revalidatePath("/plantillas");
  redirect(`/plantillas/${data.id}`);
}

export async function updateTemplateTheme(templateId: string, theme: TemplateTheme) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("templates").update({ theme }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function addPage(templateId: string, title: string) {
  const { supabase, account } = await requireAccount();

  const { count } = await supabase
    .from("template_pages")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  const { error } = await supabase.from("template_pages").insert({
    account_id: account.accountId,
    template_id: templateId,
    title,
    order_index: count ?? 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function renamePage(templateId: string, pageId: string, title: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("template_pages").update({ title }).eq("id", pageId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function deletePage(templateId: string, pageId: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("template_pages").delete().eq("id", pageId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function reorderPages(templateId: string, orderedPageIds: string[]) {
  const { supabase } = await requireAccount();
  await Promise.all(
    orderedPageIds.map((id, index) =>
      supabase.from("template_pages").update({ order_index: index }).eq("id", id),
    ),
  );
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updatePageSettings(
  templateId: string,
  pageId: string,
  settings: { showHeader: boolean; showFooter: boolean; bodyAlignH: AlignH; bodyAlignV: AlignV },
) {
  const { supabase } = await requireAccount();
  const { error } = await supabase
    .from("template_pages")
    .update({
      show_header: settings.showHeader,
      show_footer: settings.showFooter,
      body_align_h: settings.bodyAlignH,
      body_align_v: settings.bodyAlignV,
    })
    .eq("id", pageId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateTemplateHeader(templateId: string, header: HeaderFooterConfig) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("templates").update({ header }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateTemplateFooter(templateId: string, footer: HeaderFooterConfig) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("templates").update({ footer }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function addSection(templateId: string, pageId: string, type: SectionType, title: string) {
  const { supabase, account } = await requireAccount();

  const { count } = await supabase
    .from("template_sections")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);

  const { error } = await supabase.from("template_sections").insert({
    account_id: account.accountId,
    template_id: templateId,
    page_id: pageId,
    type,
    title,
    order_index: count ?? 0,
    config: {},
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function renameSection(templateId: string, sectionId: string, title: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase
    .from("template_sections")
    .update({ title })
    .eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function deleteSection(templateId: string, sectionId: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("template_sections").delete().eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function reorderSections(templateId: string, orderedSectionIds: string[]) {
  const { supabase } = await requireAccount();
  await Promise.all(
    orderedSectionIds.map((id, index) =>
      supabase.from("template_sections").update({ order_index: index }).eq("id", id),
    ),
  );
  revalidatePath(`/plantillas/${templateId}`);
}

export async function addSectionField(
  templateId: string,
  sectionId: string,
  fieldCatalogId: string,
  required: boolean,
) {
  const { supabase, account } = await requireAccount();

  const { count } = await supabase
    .from("template_section_fields")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId);

  const { error } = await supabase.from("template_section_fields").insert({
    account_id: account.accountId,
    section_id: sectionId,
    field_catalog_id: fieldCatalogId,
    order_index: count ?? 0,
    required,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function removeSectionField(templateId: string, sectionFieldId: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase
    .from("template_section_fields")
    .delete()
    .eq("id", sectionFieldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function reorderSectionFields(templateId: string, orderedFieldIds: string[]) {
  const { supabase } = await requireAccount();
  await Promise.all(
    orderedFieldIds.map((id, index) =>
      supabase.from("template_section_fields").update({ order_index: index }).eq("id", id),
    ),
  );
  revalidatePath(`/plantillas/${templateId}`);
}

export async function createCatalogField(
  templateId: string | null,
  name: string,
  dataType: DataType,
) {
  const { supabase, account } = await requireAccount();
  const { data, error } = await supabase
    .from("field_catalog")
    .insert({ account_id: account.accountId, name, data_type: dataType })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (templateId) revalidatePath(`/plantillas/${templateId}`);
  revalidatePath("/catalogo");
  return data;
}

export async function deleteCatalogField(fieldId: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("field_catalog").delete().eq("id", fieldId);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Este campo está en uso en una o más plantillas y no se puede eliminar.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/catalogo");
}

export async function uploadLogo(templateId: string, formData: FormData) {
  const { supabase, account } = await requireAccount();
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) throw new Error("No se seleccionó ningún archivo.");

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${account.accountId}/${templateId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(path);

  const { data: template, error: fetchError } = await supabase
    .from("templates")
    .select("theme")
    .eq("id", templateId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextTheme = { ...(template.theme as TemplateTheme), logoPath: publicUrl };
  const { error: updateError } = await supabase
    .from("templates")
    .update({ theme: nextTheme })
    .eq("id", templateId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/plantillas/${templateId}`);
}
