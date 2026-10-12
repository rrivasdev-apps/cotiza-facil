"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import {
  DEFAULT_THEME,
  normalizeHeaderFooter,
  withFieldStyleDefaults,
  type FieldCatalogEntry,
  type PageWithSections,
  type SectionWithFields,
  type Template,
  type TemplateSectionField,
} from "@/lib/types";
import { GALLERY_TEMPLATES } from "./gallery";
import { serializeTemplateToGalleryDef, slugifyGalleryKey } from "./gallery-serialize";
import { buildGalleryPreviewDocument } from "./gallery-preview";
import { renderPresupuestoPdfHtml } from "@/lib/pdf/render-document";
import { htmlToPreviewPng } from "@/lib/pdf/generate";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  if (!account.isPlatformAdmin) throw new Error("No autorizado.");
  return { supabase, account };
}

async function loadFullTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<{ template: Template; pages: PageWithSections[] }> {
  const { data: template, error: templateError } = await supabase.from("templates").select("*").eq("id", templateId).single();
  if (templateError || !template) throw new Error("Plantilla no encontrada.");

  const { data: pages } = await supabase.from("template_pages").select("*").eq("template_id", templateId).order("order_index");

  const { data: sections } = await supabase.from("template_sections").select("*").eq("template_id", templateId).order("order_index");

  const { data: sectionFields } = await supabase
    .from("template_section_fields")
    .select("*, field:field_catalog!template_section_fields_field_catalog_id_fkey(*)")
    .in("section_id", (sections ?? []).map((s) => s.id))
    .order("order_index");

  const sectionsWithFields: SectionWithFields[] = (sections ?? []).map((section) => ({
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

  return { template: templateWithDefaults, pages: pagesWithSections };
}

// Convierte una plantilla ya armada en la CUENTA DEL ADMIN (se lee con
// el cliente normal, con RLS — nunca el cliente admin para la lectura,
// así que solo puede convertir plantillas de su propia cuenta) en un
// elemento más de /plantillas/galeria. El PNG de la tarjeta se genera
// al vuelo (mismo motor que "Ver PDF de ejemplo"), no hace falta
// subirlo a mano como con las plantillas de gallery.ts.
export async function addTemplateToGallery(templateId: string, name: string, description: string): Promise<{ key: string }> {
  const { supabase, account } = await requirePlatformAdmin();

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  if (!trimmedName) throw new Error("Falta el nombre.");
  if (!trimmedDescription) throw new Error("Falta la descripción.");

  const { template, pages } = await loadFullTemplate(supabase, templateId);

  const baseKey = slugifyGalleryKey(trimmedName);
  const { data: existingKeys } = await supabase.from("gallery_templates").select("key").like("key", `${baseKey}%`);
  const staticKeys = GALLERY_TEMPLATES.map((t) => t.key);
  const takenKeys = new Set([...staticKeys, ...(existingKeys ?? []).map((r) => r.key as string)]);
  let key = baseKey;
  let suffix = 2;
  while (takenKeys.has(key)) {
    key = `${baseKey}-${suffix}`;
    suffix++;
  }

  const def = serializeTemplateToGalleryDef(template, pages, {
    key,
    name: trimmedName,
    description: trimmedDescription,
    previewImage: "",
  });

  const previewDoc = buildGalleryPreviewDocument(def);
  const previewHtml = renderPresupuestoPdfHtml(previewDoc.presupuesto, previewDoc.template, previewDoc.pages, previewDoc.catalogFields);
  const previewPng = await htmlToPreviewPng(previewHtml);

  const admin = createAdminClient();
  const previewPath = `gallery-assets/custom/${key}.png`;
  const { error: uploadError } = await admin.storage.from("logos").upload(previewPath, previewPng, {
    upsert: true,
    contentType: "image/png",
  });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = admin.storage.from("logos").getPublicUrl(previewPath);
  const previewImage = `${publicUrl}?v=${Date.now()}`;

  // definition guarda todo menos key/name/description/previewImage —
  // esas cuatro ya son columnas propias de la fila (ver
  // loadAllGalleryTemplates, que las vuelve a unir al leer).
  const { theme, header, footer, totalFieldName, pages: defPages } = def;
  const definition = { theme, header, footer, totalFieldName, pages: defPages };

  const { error: insertError } = await admin.from("gallery_templates").insert({
    key,
    name: trimmedName,
    description: trimmedDescription,
    preview_image: previewImage,
    definition,
    source_template_id: templateId,
    created_by_account_id: account.accountId,
  });
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/plantillas/galeria");
  return { key };
}

export async function removeTemplateFromGallery(key: string) {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: row } = await admin.from("gallery_templates").select("preview_image").eq("key", key).maybeSingle();
  if (row?.preview_image) {
    const path = new URL(row.preview_image).pathname.split("/storage/v1/object/public/logos/")[1];
    if (path) await admin.storage.from("logos").remove([path]);
  }

  const { error } = await admin.from("gallery_templates").delete().eq("key", key);
  if (error) throw new Error(error.message);

  revalidatePath("/plantillas/galeria");
}
