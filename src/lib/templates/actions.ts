"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import {
  DEFAULT_FIELD_STYLE,
  DEFAULT_THEME,
  type AlignH,
  type AlignV,
  type DataType,
  type FieldStyle,
  type HeaderFooterConfig,
  type MastheadStyle,
  type SectionMargins,
  type SectionType,
  type TemplateTheme,
} from "@/lib/types";
import { isSectionTotalFieldId, sectionIdFromTotalFieldId, sectionTotalFieldId } from "@/lib/presupuesto-items";
import { GALLERY_TEMPLATES } from "@/lib/templates/gallery";

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

// Siembra una plantilla nueva a partir de una de la galería (ver
// src/lib/templates/gallery.ts) — mismo resultado que armarla a mano en
// Estructura/Tema, solo que ya viene lista. field_catalog se crea
// fresco por cuenta (un nombre de campo puede repetirse entre
// plantillas de la galería sin problema, cada una tiene sus propias
// filas).
export async function createTemplateFromGallery(key: string) {
  const def = GALLERY_TEMPLATES.find((t) => t.key === key);
  if (!def) throw new Error("Plantilla de galería no encontrada.");

  const { supabase, account } = await requireAccount();

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .insert({ account_id: account.accountId, name: def.name, theme: def.theme, header: def.header, footer: def.footer })
    .select("id")
    .single();
  if (templateError) throw new Error(templateError.message);
  const templateId = template.id;

  const fieldIdByName = new Map<string, string>();
  // Índice global de sección (todas las páginas, en orden) -> su id real
  // — resuelve los placeholders {{SECTION_TOTAL:n}} de gallery.ts contra
  // el Total General sintético de esa sección (ver sectionTotalFieldId).
  const sectionIdByGlobalIndex: string[] = [];
  let totalFieldId: string | null = null;
  let globalSectionIndex = 0;

  // Los placeholders de una fórmula (ver gallery.ts) referencian campos
  // de la MISMA plantilla que ya se crearon antes en el recorrido —
  // ambos tipos de referencia existen para cuando se procesa este campo.
  function resolveFormula(formula: string | null | undefined): string | null {
    if (!formula) return null;
    return formula
      .replace(/\{\{FIELD:([^{}]+)\}\}/g, (_m, name: string) => {
        const id = fieldIdByName.get(name);
        if (!id) throw new Error(`Fórmula de galería referencia un campo inexistente: ${name}`);
        return `{{id:${id}}}`;
      })
      .replace(/\{\{SECTION_TOTAL:(\d+)\}\}/g, (_m, idx: string) => {
        const sectionId = sectionIdByGlobalIndex[Number(idx)];
        if (!sectionId) throw new Error(`Fórmula de galería referencia una sección inexistente: ${idx}`);
        return `{{id:${sectionTotalFieldId(sectionId)}}}`;
      });
  }

  for (const [pageIndex, page] of def.pages.entries()) {
    const { data: pageRow, error: pageError } = await supabase
      .from("template_pages")
      .insert({
        account_id: account.accountId,
        template_id: templateId,
        order_index: pageIndex,
        title: page.title,
        show_header: page.show_header,
        show_footer: page.show_footer,
        body_align_h: page.body_align_h,
        body_align_v: page.body_align_v,
      })
      .select("id")
      .single();
    if (pageError) throw new Error(pageError.message);

    for (const [sectionIndex, section] of page.sections.entries()) {
      const { data: sectionRow, error: sectionError } = await supabase
        .from("template_sections")
        .insert({
          account_id: account.accountId,
          template_id: templateId,
          page_id: pageRow.id,
          type: section.type,
          title: section.title,
          order_index: sectionIndex,
          config: section.config,
        })
        .select("id")
        .single();
      if (sectionError) throw new Error(sectionError.message);

      sectionIdByGlobalIndex[globalSectionIndex] = sectionRow.id;
      globalSectionIndex++;

      if (section.isTotalField) totalFieldId = sectionTotalFieldId(sectionRow.id);

      for (const [fieldIndex, field] of section.fields.entries()) {
        if (field.kind === "field") {
          const existing = fieldIdByName.get(field.name);
          let fieldCatalogId: string;
          if (existing) {
            fieldCatalogId = existing;
          } else {
            const { data: catalogRow, error: catalogError } = await supabase
              .from("field_catalog")
              .insert({ account_id: account.accountId, name: field.name, data_type: field.data_type })
              .select("id")
              .single();
            if (catalogError || !catalogRow) throw new Error(catalogError?.message ?? "No se pudo crear el campo.");
            fieldCatalogId = catalogRow.id;
            fieldIdByName.set(field.name, fieldCatalogId);
          }
          if (def.totalFieldName === field.name) totalFieldId = fieldCatalogId;

          const numberInWordsOf = field.numberInWordsOfName ? fieldIdByName.get(field.numberInWordsOfName) : null;
          if (field.numberInWordsOfName && !numberInWordsOf) {
            throw new Error(`"Valor en letras" de galería referencia un campo inexistente: ${field.numberInWordsOfName}`);
          }

          const { error: fieldError } = await supabase.from("template_section_fields").insert({
            account_id: account.accountId,
            section_id: sectionRow.id,
            field_catalog_id: fieldCatalogId,
            order_index: fieldIndex,
            required: field.required,
            formula: resolveFormula(field.formula),
            number_in_words_of: numberInWordsOf ?? null,
            label_style: DEFAULT_FIELD_STYLE,
            value_style: { ...DEFAULT_FIELD_STYLE, ...field.value_style },
            visible: true,
          });
          if (fieldError) throw new Error(fieldError.message);
        } else {
          const { error: fieldError } = await supabase.from("template_section_fields").insert({
            account_id: account.accountId,
            section_id: sectionRow.id,
            field_catalog_id: null,
            composite_template: field.text,
            order_index: fieldIndex,
            required: field.required,
            label_style: DEFAULT_FIELD_STYLE,
            value_style: { ...DEFAULT_FIELD_STYLE, ...field.value_style },
            visible: true,
          });
          if (fieldError) throw new Error(fieldError.message);
        }
      }
    }
  }

  if (totalFieldId) {
    const { error: totalError } = await supabase.from("templates").update({ total_field_id: totalFieldId }).eq("id", templateId);
    if (totalError) throw new Error(totalError.message);
  }

  revalidatePath("/plantillas");
  redirect(`/plantillas/${templateId}`);
}

// Borra una plantilla. Páginas, secciones y campos de sección cascadean
// solos (FK on delete cascade). Los presupuestos que ya se generaron
// contra esta plantilla NO cascadean a propósito (template_id ahí es
// on delete restrict) — son cotizaciones reales ya enviadas/aprobadas
// a clientes, así que se bloquea el borrado en vez de perderlas en
// silencio. El logo en Storage queda huérfano (no se referencia desde
// ningún otro lado, pero borrarlo no es crítico — no se limpia acá).
export async function deleteTemplate(templateId: string) {
  const { supabase } = await requireAccount();

  const { count, error: countError } = await supabase
    .from("presupuestos")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      `Esta plantilla tiene ${count} presupuesto${count === 1 ? "" : "s"} asociado${count === 1 ? "" : "s"} y no se puede eliminar.`,
    );
  }

  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath("/plantillas");
}

// Clona una plantilla completa (páginas, secciones y campos) dentro de
// la misma cuenta. Se hace con inserts secuenciales (no en bulk) para
// poder mapear cada id viejo -> id nuevo antes de insertar sus hijos.
export async function duplicateTemplate(templateId: string) {
  const { supabase, account } = await requireAccount();

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (templateError || !template) throw new Error(templateError?.message ?? "Plantilla no encontrada.");

  const { data: pages, error: pagesError } = await supabase
    .from("template_pages")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index");
  if (pagesError) throw new Error(pagesError.message);

  const { data: sections, error: sectionsError } = await supabase
    .from("template_sections")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index");
  if (sectionsError) throw new Error(sectionsError.message);

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: sectionFields, error: fieldsError } = await supabase
    .from("template_section_fields")
    .select("*")
    .in("section_id", sectionIds.length > 0 ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");
  if (fieldsError) throw new Error(fieldsError.message);

  const { data: newTemplate, error: newTemplateError } = await supabase
    .from("templates")
    .insert({
      account_id: account.accountId,
      name: `${template.name} (copia)`,
      theme: template.theme,
      header: template.header,
      footer: template.footer,
    })
    .select("id")
    .single();
  if (newTemplateError) throw new Error(newTemplateError.message);

  const pageIdMap = new Map<string, string>();
  for (const page of pages ?? []) {
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
    if (error) throw new Error(error.message);
    pageIdMap.set(page.id, newPage.id);
  }

  const sectionIdMap = new Map<string, string>();
  for (const section of sections ?? []) {
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
    if (error) throw new Error(error.message);
    sectionIdMap.set(section.id, newSection.id);
  }

  if ((sectionFields ?? []).length > 0) {
    const { error } = await supabase.from("template_section_fields").insert(
      (sectionFields ?? []).map((sf) => ({
        account_id: account.accountId,
        section_id: sectionIdMap.get(sf.section_id),
        field_catalog_id: sf.field_catalog_id,
        order_index: sf.order_index,
        required: sf.required,
        label_style: sf.label_style,
        value_style: sf.value_style,
        number_in_words_of: sf.number_in_words_of,
        visible: sf.visible,
        composite_template: sf.composite_template,
        formula: sf.formula,
      })),
    );
    if (error) throw new Error(error.message);
  }

  // total_field_id de un campo real sigue siendo válido tal cual (el
  // catálogo no se duplica). Si apuntaba al Total General de una
  // tabla_items, esa sección sí tiene un id nuevo — hay que remapearlo.
  if (template.total_field_id) {
    let newTotalFieldId: string | undefined = template.total_field_id;
    if (isSectionTotalFieldId(template.total_field_id)) {
      const newSectionId = sectionIdMap.get(sectionIdFromTotalFieldId(template.total_field_id));
      newTotalFieldId = newSectionId ? sectionTotalFieldId(newSectionId) : undefined;
    }
    if (newTotalFieldId) {
      const { error } = await supabase
        .from("templates")
        .update({ total_field_id: newTotalFieldId })
        .eq("id", newTemplate.id);
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/plantillas");
  redirect(`/plantillas/${newTemplate.id}`);
}

// Cuál campo (real o Total General de una tabla_items) es "el total"
// de cada presupuesto hecho con esta plantilla — se resuelve y se
// guarda en presupuestos.total_amount al cargar/editar cada uno, ver
// buildPresupuestoData en presupuestos/actions.ts. null = ninguno.
export async function updateTemplateTotalField(templateId: string, totalFieldId: string | null) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("templates").update({ total_field_id: totalFieldId }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function renameTemplate(templateId: string, name: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("templates").update({ name }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
  revalidatePath("/plantillas");
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

export async function updateSectionMargins(templateId: string, sectionId: string, margins: SectionMargins) {
  const { supabase } = await requireAccount();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), margin: margins };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateSectionMasthead(templateId: string, sectionId: string, style: MastheadStyle) {
  const { supabase } = await requireAccount();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), masthead: style };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
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
    label_style: DEFAULT_FIELD_STYLE,
    value_style: DEFAULT_FIELD_STYLE,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

// Cambia el estilo de etiqueta/valor (o el "obligatorio") de un campo
// ya asignado a una sección, sin tener que borrarlo y volver a
// agregarlo. labelStyle/valueStyle se guardan completos (no parciales
// — el caller ya los arma a partir del valor actual + el cambio).
export async function updateSectionField(
  templateId: string,
  sectionFieldId: string,
  patch: {
    labelStyle?: FieldStyle;
    valueStyle?: FieldStyle;
    required?: boolean;
    numberInWordsOf?: string | null;
    visible?: boolean;
    formula?: string | null;
  },
) {
  const { supabase } = await requireAccount();
  const update: Record<string, unknown> = {};
  if (patch.labelStyle) update.label_style = patch.labelStyle;
  if (patch.valueStyle) update.value_style = patch.valueStyle;
  if ("required" in patch) update.required = patch.required;
  if ("numberInWordsOf" in patch) update.number_in_words_of = patch.numberInWordsOf;
  if ("visible" in patch) update.visible = patch.visible;
  if ("formula" in patch) update.formula = patch.formula;

  const { error } = await supabase.from("template_section_fields").update(update).eq("id", sectionFieldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

// Una "línea combinada": texto libre con campos intercalados (ver
// src/lib/composite-template.ts para el formato de `template`). No
// tiene field_catalog_id propio — no captura su propio dato, solo
// muestra valores de otros campos ya cargados.
export async function addCompositeLine(templateId: string, sectionId: string, template: string) {
  const { supabase, account } = await requireAccount();

  const { count } = await supabase
    .from("template_section_fields")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId);

  const { error } = await supabase.from("template_section_fields").insert({
    account_id: account.accountId,
    section_id: sectionId,
    field_catalog_id: null,
    composite_template: template,
    order_index: count ?? 0,
    required: false,
    label_style: DEFAULT_FIELD_STYLE,
    value_style: DEFAULT_FIELD_STYLE,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateCompositeLine(templateId: string, sectionFieldId: string, template: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase
    .from("template_section_fields")
    .update({ composite_template: template })
    .eq("id", sectionFieldId);
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

export async function updateCatalogField(fieldId: string, name: string, dataType: DataType) {
  const { supabase } = await requireAccount();
  const { error } = await supabase
    .from("field_catalog")
    .update({ name, data_type: dataType })
    .eq("id", fieldId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalogo");
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
