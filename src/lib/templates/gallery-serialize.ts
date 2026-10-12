import type { PageWithSections, Template } from "@/lib/types";
import { ID_TOKEN_RE } from "@/lib/composite-template";
import { isSectionTotalFieldId, sectionIdFromTotalFieldId, sectionTotalFieldId } from "@/lib/presupuesto-items";
import type { GalleryFieldDef, GalleryPageDef, GalleryTemplateDef } from "./gallery";

// Inverso de createTemplateFromGallery (ver templates/actions.ts): a
// partir de una plantilla real ya armada en una cuenta (Template +
// PageWithSections[]), arma el mismo GalleryTemplateDef que si alguien
// lo hubiera escrito a mano en gallery.ts — reemplaza cada
// "{{id:<uuid>}}" de una fórmula o línea combinada por el placeholder
// por nombre ({{FIELD:<nombre>}} / {{SECTION_TOTAL:<índice>}}) que
// createTemplateFromGallery sabe resolver de vuelta a ids reales al
// crear la copia en otra cuenta.
export function serializeTemplateToGalleryDef(
  template: Template,
  pages: PageWithSections[],
  overrides: { key: string; name: string; description: string; previewImage: string },
): GalleryTemplateDef {
  const fieldNameById = new Map<string, string>();
  for (const page of pages) {
    for (const section of page.sections) {
      for (const sf of section.fields) {
        if (sf.field) fieldNameById.set(sf.field.id, sf.field.name);
      }
    }
  }

  const sectionIndexById = new Map<string, number>();
  let globalIndex = 0;
  for (const page of pages) {
    for (const section of page.sections) {
      sectionIndexById.set(section.id, globalIndex);
      globalIndex++;
    }
  }

  function resolveIdTokensBack(text: string): string {
    return text.replace(ID_TOKEN_RE, (_m, id: string) => {
      if (isSectionTotalFieldId(id)) {
        const sectionIndex = sectionIndexById.get(sectionIdFromTotalFieldId(id));
        if (sectionIndex === undefined) {
          throw new Error("Esta plantilla referencia el Total General de una sección que ya no existe.");
        }
        return `{{SECTION_TOTAL:${sectionIndex}}}`;
      }
      const name = fieldNameById.get(id);
      if (!name) throw new Error("Esta plantilla referencia un campo que ya no existe en el catálogo.");
      return `{{FIELD:${name}}}`;
    });
  }

  const totalFieldName =
    template.total_field_id && !isSectionTotalFieldId(template.total_field_id)
      ? (fieldNameById.get(template.total_field_id) ?? null)
      : null;

  const galleryPages: GalleryPageDef[] = pages.map((page) => ({
    title: page.title,
    show_header: page.show_header,
    show_footer: page.show_footer,
    body_align_h: page.body_align_h,
    body_align_v: page.body_align_v,
    sections: page.sections.map((section) => ({
        type: section.type,
        title: section.title,
        config: section.config,
        isTotalField: template.total_field_id === sectionTotalFieldId(section.id),
        fields: section.fields
          .filter((sf) => sf.visible)
          .map((sf): GalleryFieldDef => {
            if (sf.field) {
              return {
                kind: "field",
                name: sf.field.name,
                data_type: sf.field.data_type,
                required: sf.required,
                value_style: sf.value_style,
                formula: sf.formula ? resolveIdTokensBack(sf.formula) : null,
                numberInWordsOfName: sf.number_in_words_of ? (fieldNameById.get(sf.number_in_words_of) ?? null) : null,
              };
            }
            return {
              kind: "composite",
              text: resolveIdTokensBack(sf.composite_template ?? ""),
              required: sf.required,
              value_style: sf.value_style,
            };
          }),
      })),
  }));

  return {
    key: overrides.key,
    name: overrides.name,
    description: overrides.description,
    previewImage: overrides.previewImage,
    theme: template.theme,
    header: template.header,
    footer: template.footer,
    totalFieldName,
    pages: galleryPages,
  };
}

// Slug legible a partir del nombre de la plantilla ("Fiesta Infantil
// Pro" -> "fiesta-infantil-pro") — createTemplateFromGallery y la
// galería usan este key para identificar la plantilla en la URL/acción,
// así que debe ser único entre GALLERY_TEMPLATES y gallery_templates
// (ver addTemplateToGallery, que le suma un sufijo si ya existe).
export function slugifyGalleryKey(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "plantilla"
  );
}
