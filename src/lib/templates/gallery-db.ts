import type { SupabaseClient } from "@supabase/supabase-js";
import { GALLERY_TEMPLATES, type GalleryTemplateDef } from "./gallery";

function rowToDef(row: {
  key: string;
  name: string;
  description: string;
  preview_image: string;
  definition: unknown;
}): GalleryTemplateDef {
  return {
    key: row.key,
    name: row.name,
    description: row.description,
    previewImage: row.preview_image,
    ...(row.definition as Omit<GalleryTemplateDef, "key" | "name" | "description" | "previewImage">),
  };
}

// Lee gallery_templates (tabla, ver migración 20261012210000) y la
// combina con GALLERY_TEMPLATES (código estático) — mismo
// GalleryTemplateDef para ambas, así que /plantillas/galeria,
// createTemplateFromGallery y la ruta de PDF de ejemplo no necesitan
// saber de dónde salió cada una.
export async function loadAllGalleryTemplates(supabase: SupabaseClient): Promise<GalleryTemplateDef[]> {
  const { data, error } = await supabase
    .from("gallery_templates")
    .select("key, name, description, preview_image, definition")
    .order("created_at");
  if (error || !data) return GALLERY_TEMPLATES;

  return [...GALLERY_TEMPLATES, ...data.map(rowToDef)];
}

export async function findGalleryTemplateDef(supabase: SupabaseClient, key: string): Promise<GalleryTemplateDef | null> {
  const fromCode = GALLERY_TEMPLATES.find((t) => t.key === key);
  if (fromCode) return fromCode;

  const { data } = await supabase
    .from("gallery_templates")
    .select("key, name, description, preview_image, definition")
    .eq("key", key)
    .maybeSingle();
  return data ? rowToDef(data) : null;
}
