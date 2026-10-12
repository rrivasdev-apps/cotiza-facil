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
// saber de dónde salió cada una. Una plantilla estática "eliminada"
// por un admin (ver removeTemplateFromGallery) no se borra de
// gallery.ts — su key queda en gallery_template_hidden_keys (migración
// 20261012220000) y se descarta acá, antes de combinar.
export async function loadAllGalleryTemplates(supabase: SupabaseClient): Promise<GalleryTemplateDef[]> {
  const [{ data, error }, { data: hiddenRows }] = await Promise.all([
    supabase.from("gallery_templates").select("key, name, description, preview_image, definition").order("created_at"),
    supabase.from("gallery_template_hidden_keys").select("key"),
  ]);

  const hiddenKeys = new Set((hiddenRows ?? []).map((r) => r.key as string));
  const visibleStatic = GALLERY_TEMPLATES.filter((t) => !hiddenKeys.has(t.key));

  if (error || !data) return visibleStatic;
  return [...visibleStatic, ...data.map(rowToDef)];
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
