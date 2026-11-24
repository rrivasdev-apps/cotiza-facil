"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import {
  DEFAULT_BACKGROUND_IMAGE,
  DEFAULT_FIELD_STYLE,
  defaultValueStyle,
  DEFAULT_THEME,
  getImagenesConfig,
  type AlignH,
  type AlignV,
  type ColumnsConfig,
  type DataType,
  type DatosClienteFields,
  type DatosClienteStyles,
  type FieldSavedValue,
  type FieldStyle,
  type HeaderFooterConfig,
  type ImagenesConfig,
  type ItemsStyleConfig,
  type MastheadStyle,
  type RowSpacingConfig,
  type SectionMargins,
  type SectionTitleConfig,
  type SectionType,
  type TablaItemsBordersConfig,
  type TablaItemsRulesConfig,
  type TemplateTheme,
} from "@/lib/types";
import sharp from "sharp";
import { ID_TOKEN_RE } from "@/lib/composite-template";
import { isSectionTotalFieldId, sectionIdFromTotalFieldId, sectionTotalFieldId } from "@/lib/presupuesto-items";
import { GALLERY_TEMPLATES } from "@/lib/templates/gallery";
import { findGalleryTemplateDef } from "@/lib/templates/gallery-db";
import { getPlanUsage, IMAGE_LIMIT_MESSAGE, TEMPLATE_LIMIT_MESSAGE } from "@/lib/plan-usage";
import { FREE_LIMITS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
import { buildTemplateEditorPreviewPresupuesto } from "@/lib/templates/editor-preview";
import { renderPresupuestoPdfHtml } from "@/lib/pdf/render-document";
import type { FieldCatalogEntry, PageWithSections, Template } from "@/lib/types";

async function requireMember() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
}

// Plantillas, catálogo y estructura son del propietario: RLS ya bloquea
// la escritura del colaborador, pero esta validación da un error claro
// en vez de una actualización que "no hace nada". Solo los valores
// guardados (autocompletar al llenar un presupuesto) usan requireMember.
async function requireOwner() {
  const result = await requireMember();
  if (!result.account.isOwner) throw new Error("Solo el propietario del workspace puede hacer esto.");
  return result;
}

// Si la cuenta todavía no tiene ninguna plantilla marcada como
// predeterminada, la recién creada pasa a serlo — cubre tanto la
// primera plantilla de una cuenta nueva (el caso normal) como una
// cuenta que por algún motivo se quedó sin default (ej. borró la que
// tenía). El update condicionado a "is null" evita pisar una elección
// ya hecha por el usuario si ya tiene otra plantilla.
export async function setDefaultTemplateIfUnset(
  supabase: SupabaseClient,
  accountId: string,
  templateId: string,
) {
  await supabase
    .from("accounts")
    .update({ default_template_id: templateId })
    .eq("id", accountId)
    .is("default_template_id", null);
}

// Elegida a mano desde la lista de Plantillas — acá sí pisa lo que
// hubiera antes, a diferencia de setDefaultTemplateIfUnset.
export async function setDefaultTemplate(templateId: string) {
  const { supabase, account } = await requireOwner();
  const { error } = await supabase
    .from("accounts")
    .update({ default_template_id: templateId })
    .eq("id", account.accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/plantillas");
}

export async function createTemplate(_prevState: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "El nombre es obligatorio.";

  const { supabase, account } = await requireOwner();
  if ((await getPlanUsage(account.accountId)).templatesAtLimit) return TEMPLATE_LIMIT_MESSAGE;

  const { data, error } = await supabase
    .from("templates")
    .insert({ account_id: account.accountId, name, theme: DEFAULT_THEME })
    .select("id")
    .single();

  if (error) return `No se pudo crear la plantilla: ${error.message}`;

  await setDefaultTemplateIfUnset(supabase, account.accountId, data.id);

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
  const { supabase, account } = await requireOwner();

  // Primero el array estático (gallery.ts), y si no está ahí, una
  // plantilla que un admin agregó desde una cuenta real (ver
  // addTemplateToGallery) — misma forma (GalleryTemplateDef) para
  // ambas, así que el resto de esta función no distingue una de otra.
  const def = GALLERY_TEMPLATES.find((t) => t.key === key) ?? (await findGalleryTemplateDef(supabase, key));
  if (!def) throw new Error("Plantilla de galería no encontrada.");

  // Campos que ya existen en el catálogo de la cuenta, por nombre — para
  // reusarlos en vez de crear uno nuevo con el mismo nombre. Antes esto
  // no se revisaba: cada plantilla de galería elegida creaba su propio
  // juego de campos desde cero, aunque ya hubiera uno idéntico de una
  // plantilla anterior. Solo se reusa si además coincide el tipo de
  // dato — si alguien ya tiene "Subtotal" como texto_corto y la galería
  // lo espera como moneda, mejor un nombre duplicado que un campo con
  // el tipo equivocado.
  const { data: existingCatalog } = await supabase.from("field_catalog").select("id, name, data_type");
  const existingByName = new Map<string, { id: string; data_type: DataType }>();
  for (const f of existingCatalog ?? []) {
    if (!existingByName.has(f.name)) existingByName.set(f.name, { id: f.id, data_type: f.data_type as DataType });
  }

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .insert({ account_id: account.accountId, name: def.name, theme: def.theme, header: def.header, footer: def.footer })
    .select("id")
    .single();
  if (templateError) throw new Error(templateError.message);
  const templateId = template.id;

  const fieldIdByName = new Map<string, string>();

  // Pasada previa: resuelve/crea el field_catalog de CADA campo con
  // nombre antes de tocar páginas/secciones. Necesario porque una
  // fórmula o un "valor en letras" puede referenciar, por nombre, un
  // campo que aparece más abajo en la plantilla (ej. una sección de
  // ítems que calcula "Subtotal" después de un campo que lo expresa en
  // letras, en una sección anterior) — resolver sobre la marcha, en el
  // mismo recorrido que inserta secciones/campos, fallaba con "campo
  // inexistente" aunque el campo sí estuviera en la plantilla, solo que
  // más adelante.
  for (const page of def.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        if (field.kind !== "field" || fieldIdByName.has(field.name)) continue;
        const accountExisting = existingByName.get(field.name);
        if (accountExisting && accountExisting.data_type === field.data_type) {
          fieldIdByName.set(field.name, accountExisting.id);
          continue;
        }
        const { data: catalogRow, error: catalogError } = await supabase
          .from("field_catalog")
          .insert({ account_id: account.accountId, name: field.name, data_type: field.data_type })
          .select("id")
          .single();
        if (catalogError || !catalogRow) throw new Error(catalogError?.message ?? "No se pudo crear el campo.");
        fieldIdByName.set(field.name, catalogRow.id);
      }
    }
  }

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

  // Las líneas combinadas (texto con campos intercalados) guardan los
  // mismos placeholders por nombre que las fórmulas, y también hay que
  // volverlos {{id:...}} reales; sin esto el presupuesto imprimía el
  // "{{FIELD:Producto}}" literal. A diferencia de una fórmula, una
  // referencia que no se puede resolver (el campo no vino en la
  // definición de la galería) no frena la creación de la plantilla: se
  // quita, igual que hace el motor al imprimir con un id borrado.
  function resolveCompositeText(text: string): string {
    return text
      .replace(/\{\{FIELD:([^{}]+)\}\}/g, (_m, name: string) => {
        const id = fieldIdByName.get(name);
        return id ? `{{id:${id}}}` : "";
      })
      .replace(/\{\{SECTION_TOTAL:(\d+)\}\}/g, (_m, idx: string) => {
        const sectionId = sectionIdByGlobalIndex[Number(idx)];
        return sectionId ? `{{id:${sectionTotalFieldId(sectionId)}}}` : "";
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
        show_background_image: page.show_background_image ?? true,
        bg_color: page.bg_color ?? null,
        text_color: page.text_color ?? null,
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
          // Ya resuelto en la pasada previa — siempre existe.
          const fieldCatalogId = fieldIdByName.get(field.name)!;
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
            value_style: { ...defaultValueStyle(section.type), ...field.value_style },
            visible: field.visible ?? true,
          });
          if (fieldError) throw new Error(fieldError.message);
        } else {
          const compositeText = resolveCompositeText(field.text);
          // Una línea que era solo referencias sin resolver quedaría
          // vacía: se omite en vez de dejar una fila en blanco.
          if (field.text.trim() && !compositeText.trim()) continue;
          const { error: fieldError } = await supabase.from("template_section_fields").insert({
            account_id: account.accountId,
            section_id: sectionRow.id,
            field_catalog_id: null,
            composite_template: compositeText,
            order_index: fieldIndex,
            required: field.required,
            label_style: DEFAULT_FIELD_STYLE,
            value_style: { ...defaultValueStyle(section.type), ...field.value_style },
            visible: field.visible ?? true,
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

  await setDefaultTemplateIfUnset(supabase, account.accountId, templateId);

  revalidatePath("/plantillas");
  // Una cuenta que acaba de elegir de la galería sigue en el asistente
  // guiado, no en el editor completo.
  redirect(`/plantillas/${templateId}/asistente`);
}

// Borra una plantilla. Páginas, secciones y campos de sección cascadean
// solos (FK on delete cascade). Los presupuestos que ya se generaron
// contra esta plantilla NO cascadean a propósito (template_id ahí es
// on delete restrict) — son cotizaciones reales ya enviadas/aprobadas
// a clientes, así que se bloquea el borrado en vez de perderlas en
// silencio. El logo en Storage queda huérfano (no se referencia desde
// ningún otro lado, pero borrarlo no es crítico — no se limpia acá).
export async function deleteTemplate(templateId: string) {
  const { supabase, account } = await requireOwner();

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

  const { data: imageSections } = await supabase
    .from("template_sections")
    .select("config")
    .eq("template_id", templateId)
    .eq("type", "imagenes");

  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);

  const urls = (imageSections ?? []).flatMap((row) =>
    getImagenesConfig((row.config ?? {}) as Record<string, unknown>).images.map((image) => image.url),
  );
  await removeUnusedSectionImageFiles(supabase, account.accountId, urls);
  revalidatePath("/plantillas");
}

// Clona una plantilla completa (páginas, secciones y campos) dentro de
// la misma cuenta. Se hace con inserts secuenciales (no en bulk) para
// poder mapear cada id viejo -> id nuevo antes de insertar sus hijos.
export async function duplicateTemplate(templateId: string) {
  const { supabase, account } = await requireOwner();

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
        show_background_image: page.show_background_image,
        bg_color: page.bg_color,
        text_color: page.text_color,
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

  // El catálogo no se duplica (sus ids siguen valiendo), pero un Total
  // General de tabla_items es un id sintético "section-total:<sección>"
  // y las secciones sí tienen ids nuevos: sin remapearlo, una fórmula o
  // línea combinada de la copia seguiría apuntando a la sección de la
  // plantilla original.
  const remapId = (oldId: string): string => {
    if (!isSectionTotalFieldId(oldId)) return oldId;
    const newSectionId = sectionIdMap.get(sectionIdFromTotalFieldId(oldId));
    if (!newSectionId) throw new Error("Esta plantilla referencia el Total General de una sección que ya no existe.");
    return sectionTotalFieldId(newSectionId);
  };
  const remapTokens = (text: string | null): string | null =>
    text ? text.replace(ID_TOKEN_RE, (_match, id: string) => `{{id:${remapId(id)}}}`) : text;

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
        number_in_words_of: sf.number_in_words_of ? remapId(sf.number_in_words_of) : null,
        number_in_words_include_amount: sf.number_in_words_include_amount,
        visible: sf.visible,
        composite_template: remapTokens(sf.composite_template),
        formula: remapTokens(sf.formula),
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
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("templates").update({ total_field_id: totalFieldId }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function renameTemplate(templateId: string, name: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("templates").update({ name }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
  revalidatePath("/plantillas");
}

export async function updateTemplateTheme(templateId: string, theme: TemplateTheme) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("templates").update({ theme }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function addPage(templateId: string, title: string) {
  const { supabase, account } = await requireOwner();

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
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("template_pages").update({ title }).eq("id", pageId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function deletePage(templateId: string, pageId: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("template_pages").delete().eq("id", pageId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function reorderPages(templateId: string, orderedPageIds: string[]) {
  const { supabase } = await requireOwner();
  await Promise.all(
    orderedPageIds.map((id, index) =>
      supabase.from("template_pages").update({ order_index: index }).eq("id", id),
    ),
  );
  revalidatePath(`/plantillas/${templateId}`);
}

// Parcial a propósito: cada cambio manda SOLO el campo que tocó la
// persona. Si se reenviaran todos los ajustes desde lo que el editor
// tiene en pantalla, un cambio hecho antes de que la página se
// refrescara quedaría pisado por el valor viejo del siguiente.
export async function updatePageSettings(
  templateId: string,
  pageId: string,
  settings: Partial<{
    showHeader: boolean;
    showFooter: boolean;
    showBackgroundImage: boolean;
    bgColor: string | null;
    textColor: string | null;
    bodyAlignH: AlignH;
    bodyAlignV: AlignV;
  }>,
) {
  const { supabase } = await requireOwner();
  const columns = {
    show_header: settings.showHeader,
    show_footer: settings.showFooter,
    show_background_image: settings.showBackgroundImage,
    bg_color: settings.bgColor,
    text_color: settings.textColor,
    body_align_h: settings.bodyAlignH,
    body_align_v: settings.bodyAlignV,
  };
  // undefined = "no tocar"; null sí es un valor (volver al color del tema).
  const changes = Object.fromEntries(Object.entries(columns).filter(([, value]) => value !== undefined));
  if (Object.keys(changes).length === 0) return;
  const { error } = await supabase.from("template_pages").update(changes).eq("id", pageId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateTemplateHeader(templateId: string, header: HeaderFooterConfig) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("templates").update({ header }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateTemplateFooter(templateId: string, footer: HeaderFooterConfig) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("templates").update({ footer }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function addSection(templateId: string, pageId: string, type: SectionType, title: string) {
  const { supabase, account } = await requireOwner();

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
  const { supabase } = await requireOwner();
  const { error } = await supabase
    .from("template_sections")
    .update({ title })
    .eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateSectionMargins(templateId: string, sectionId: string, margins: SectionMargins) {
  const { supabase } = await requireOwner();
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

export async function updateSectionRowSpacing(templateId: string, sectionId: string, rowSpacing: RowSpacingConfig) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), rowSpacing };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateSectionItemsBorders(templateId: string, sectionId: string, itemsBorders: TablaItemsBordersConfig) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), itemsBorders };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateSectionItemsRules(templateId: string, sectionId: string, itemsRules: TablaItemsRulesConfig) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), itemsRules };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

// Una tabla_items no tiene fields propios (sus 4 columnas no son
// campos del catálogo, ver la nota en getItemsStyle) — así que a
// diferencia de updateFieldStyle (más abajo, por fila de
// template_section_fields), el estilo de encabezado/cuerpo de esta
// tabla vive directo en section.config, igual que itemsRules/columns.
export async function updateSectionItemsStyle(templateId: string, sectionId: string, itemsStyle: ItemsStyleConfig) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), itemsStyle };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateSectionMasthead(templateId: string, sectionId: string, style: MastheadStyle) {
  const { supabase } = await requireOwner();
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

export async function updateSectionHideTitle(templateId: string, sectionId: string, hide: boolean) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), hideTitle: hide };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateSectionTitleConfig(templateId: string, sectionId: string, titleConfig: SectionTitleConfig) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), title: titleConfig };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateDatosClienteFields(templateId: string, sectionId: string, fields: DatosClienteFields) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), datosCliente: fields };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateDatosClienteStyles(templateId: string, sectionId: string, styles: DatosClienteStyles) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), datosClienteStyles: styles };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateSectionColumns(templateId: string, sectionId: string, columns: ColumnsConfig) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), columns };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateSectionTituloRules(templateId: string, sectionId: string, rules: boolean) {
  const { supabase } = await requireOwner();
  const { data: section, error: fetchError } = await supabase
    .from("template_sections")
    .select("config")
    .eq("id", sectionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextConfig = { ...(section.config as Record<string, unknown>), titulo: { rules } };
  const { error } = await supabase.from("template_sections").update({ config: nextConfig }).eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function deleteSection(templateId: string, sectionId: string) {
  const { supabase, account } = await requireOwner();
  const { data: section } = await supabase.from("template_sections").select("type, config").eq("id", sectionId).single();
  const { error } = await supabase.from("template_sections").delete().eq("id", sectionId);
  if (error) throw new Error(error.message);
  if (section?.type === "imagenes") {
    const urls = getImagenesConfig((section.config ?? {}) as Record<string, unknown>).images.map((image) => image.url);
    await removeUnusedSectionImageFiles(supabase, account.accountId, urls);
  }
  revalidatePath(`/plantillas/${templateId}`);
}

export async function reorderSections(templateId: string, orderedSectionIds: string[]) {
  const { supabase } = await requireOwner();
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
  const { supabase, account } = await requireOwner();

  const [{ count }, { data: section, error: sectionError }] = await Promise.all([
    supabase.from("template_section_fields").select("id", { count: "exact", head: true }).eq("section_id", sectionId),
    supabase.from("template_sections").select("type").eq("id", sectionId).single(),
  ]);
  if (sectionError) throw new Error(sectionError.message);

  const { error } = await supabase.from("template_section_fields").insert({
    account_id: account.accountId,
    section_id: sectionId,
    field_catalog_id: fieldCatalogId,
    order_index: count ?? 0,
    required,
    label_style: DEFAULT_FIELD_STYLE,
    value_style: defaultValueStyle(section.type),
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
    numberInWordsIncludeAmount?: boolean;
    visible?: boolean;
    formula?: string | null;
  },
) {
  const { supabase } = await requireOwner();
  const update: Record<string, unknown> = {};
  if (patch.labelStyle) update.label_style = patch.labelStyle;
  if (patch.valueStyle) update.value_style = patch.valueStyle;
  if ("required" in patch) update.required = patch.required;
  if ("numberInWordsOf" in patch) update.number_in_words_of = patch.numberInWordsOf;
  if ("numberInWordsIncludeAmount" in patch) update.number_in_words_include_amount = patch.numberInWordsIncludeAmount;
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
  const { supabase, account } = await requireOwner();

  const [{ count }, { data: section, error: sectionError }] = await Promise.all([
    supabase.from("template_section_fields").select("id", { count: "exact", head: true }).eq("section_id", sectionId),
    supabase.from("template_sections").select("type").eq("id", sectionId).single(),
  ]);
  if (sectionError) throw new Error(sectionError.message);

  const { error } = await supabase.from("template_section_fields").insert({
    account_id: account.accountId,
    section_id: sectionId,
    field_catalog_id: null,
    composite_template: template,
    order_index: count ?? 0,
    required: false,
    label_style: DEFAULT_FIELD_STYLE,
    value_style: defaultValueStyle(section.type),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function updateCompositeLine(templateId: string, sectionFieldId: string, template: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase
    .from("template_section_fields")
    .update({ composite_template: template })
    .eq("id", sectionFieldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function removeSectionField(templateId: string, sectionFieldId: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase
    .from("template_section_fields")
    .delete()
    .eq("id", sectionFieldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function reorderSectionFields(templateId: string, orderedFieldIds: string[]) {
  const { supabase } = await requireOwner();
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
  useSavedValues: boolean = false,
  helpText: string = "",
) {
  const { supabase, account } = await requireOwner();
  const { data, error } = await supabase
    .from("field_catalog")
    .insert({
      account_id: account.accountId,
      name,
      data_type: dataType,
      use_saved_values: useSavedValues,
      help_text: helpText.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (templateId) revalidatePath(`/plantillas/${templateId}`);
  revalidatePath("/catalogo");
  return data;
}

export async function updateCatalogField(
  fieldId: string,
  name: string,
  dataType: DataType,
  useSavedValues: boolean = false,
  helpText: string = "",
) {
  const { supabase } = await requireOwner();
  const { error } = await supabase
    .from("field_catalog")
    .update({ name, data_type: dataType, use_saved_values: useSavedValues, help_text: helpText.trim() || null })
    .eq("id", fieldId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalogo");
}

export async function saveFieldValue(
  fieldCatalogId: string,
  value: string,
): Promise<{ ok: true; row: FieldSavedValue } | { ok: false; error: string }> {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: "El valor está vacío." };
  const { supabase, account } = await requireMember();
  const { data, error } = await supabase
    .from("field_saved_values")
    .upsert(
      { account_id: account.accountId, field_catalog_id: fieldCatalogId, value: trimmed },
      { onConflict: "field_catalog_id,value" },
    )
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya guardaste un valor igual (sin importar mayúsculas/minúsculas)." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, row: data as FieldSavedValue };
}

export async function deleteSavedValue(id: string) {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("field_saved_values").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCatalogField(fieldId: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("field_catalog").delete().eq("id", fieldId);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Este campo está en uso en una o más plantillas y no se puede eliminar.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/catalogo");
}

// Algunos logos traen horneado en el archivo un relleno de color
// uniforme alrededor del logotipo real (exportados con un lienzo más
// grande que el contenido visible) — eso se ve como "el logo chico y
// separado de lo que sigue" sin que haya ningún margen de CSS de por
// medio, porque ese espacio son píxeles del archivo, no algo que un
// margen pueda corregir. sharp.trim() detecta el color de fondo y
// recorta los bordes uniformes de las 4 esquinas. Si falla por
// cualquier motivo (formato no soportado, etc.) se sube el archivo
// original tal cual — nunca bloquea la subida por esto.
async function trimLogoPadding(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).trim().toBuffer();
  } catch {
    return buffer;
  }
}

export async function uploadLogo(templateId: string, formData: FormData) {
  const { supabase, account } = await requireOwner();
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) throw new Error("No se seleccionó ningún archivo.");

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${account.accountId}/${templateId}.${ext}`;

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const trimmedBuffer = await trimLogoPadding(rawBuffer);

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, trimmedBuffer, { upsert: true, contentType: file.type });

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

  // El archivo en storage se sube siempre a la misma ruta (upsert) con
  // cache-control de 1h — sin esto, volver a subir un logo (ej. para
  // corregirlo) deja la URL vieja cacheada en el navegador/CDN
  // mostrando el archivo anterior, aunque el servidor ya tenga el
  // nuevo. La marca de versión en la query string fuerza una URL
  // distinta en cada subida.
  const logoPath = `${publicUrl}?v=${Date.now()}`;
  const nextTheme = { ...(template.theme as TemplateTheme), logoPath };
  const { error: updateError } = await supabase
    .from("templates")
    .update({ theme: nextTheme })
    .eq("id", templateId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/plantillas/${templateId}`);
}

export async function removeLogo(templateId: string) {
  const { supabase } = await requireOwner();

  const { data: template, error: fetchError } = await supabase
    .from("templates")
    .select("theme")
    .eq("id", templateId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const nextTheme: TemplateTheme = { ...(template.theme as TemplateTheme), logoPath: null };
  const { error: updateError } = await supabase
    .from("templates")
    .update({ theme: nextTheme })
    .eq("id", templateId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/plantillas/${templateId}`);
}

// Mismo mecanismo que uploadLogo (bucket, ruta por plantilla,
// cache-busting con ?v=) pero SIN el recorte automático de bordes —
// trimLogoPadding asume relleno sólido alrededor de un logo, y
// recortaría contenido real de una imagen de fondo/textura pensada
// para llenar todo el espacio.
export async function uploadThemeBackgroundImage(templateId: string, formData: FormData) {
  const { supabase, account } = await requireOwner();
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) throw new Error("No se seleccionó ningún archivo.");

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${account.accountId}/${templateId}-bg.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, buffer, { upsert: true, contentType: file.type });
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

  const currentTheme = template.theme as TemplateTheme;
  const imagePath = `${publicUrl}?v=${Date.now()}`;
  const nextTheme: TemplateTheme = {
    ...currentTheme,
    backgroundImage: { ...(currentTheme.backgroundImage ?? DEFAULT_BACKGROUND_IMAGE), imagePath },
  };
  const { error: updateError } = await supabase
    .from("templates")
    .update({ theme: nextTheme })
    .eq("id", templateId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/plantillas/${templateId}`);
}

export async function removeThemeBackgroundImage(templateId: string) {
  const { supabase } = await requireOwner();

  const { data: template, error: fetchError } = await supabase
    .from("templates")
    .select("theme")
    .eq("id", templateId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const currentTheme = template.theme as TemplateTheme;
  const nextTheme: TemplateTheme = {
    ...currentTheme,
    backgroundImage: { ...(currentTheme.backgroundImage ?? DEFAULT_BACKGROUND_IMAGE), imagePath: null },
  };
  const { error: updateError } = await supabase
    .from("templates")
    .update({ theme: nextTheme })
    .eq("id", templateId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/plantillas/${templateId}`);
}

// ---- Imágenes de una sección "imagenes" ---------------------------------
// Mismo bucket público que el logo ("logos"), pero con nombre plano
// "<cuenta>/img-<uuid>.<ext>" (sin subcarpetas): purgeAccount solo lista
// un nivel de "<cuenta>/", así que una subcarpeta quedaría huérfana al
// borrar la cuenta. Cada imagen tiene un uuid propio — a diferencia del
// logo no se sobrescribe, así que no necesita el ?v= anti-caché.

// Igual al bodySizeLimit de next.config.ts: más que eso ni llega acá.
const SECTION_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const SECTION_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
// 1600 px sobra para una celda de una hoja A4/carta aun a 1 columna, y
// mantiene liviano el PDF y el correo. SVG queda fuera a propósito: puede
// traer scripts, y se sirve desde un bucket público.
const SECTION_IMAGE_MAX_WIDTH = 1600;
const MAX_IMAGES_PER_SECTION = 12;
const LOGOS_PUBLIC_PREFIX = "/storage/v1/object/public/logos/";

// JPEG si no tiene transparencia, PNG si la tiene. No WebP: Outlook de
// escritorio no lo muestra en el correo.
async function normalizeSectionImage(buffer: Buffer): Promise<{ data: Buffer; ext: string; contentType: string }> {
  // rotate() aplica la orientación EXIF: una foto de celular no sale de costado.
  const pipeline = sharp(buffer).rotate().resize({ width: SECTION_IMAGE_MAX_WIDTH, withoutEnlargement: true });
  const { hasAlpha } = await sharp(buffer).metadata();
  return hasAlpha
    ? { data: await pipeline.png({ compressionLevel: 9 }).toBuffer(), ext: "png", contentType: "image/png" }
    : { data: await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), ext: "jpg", contentType: "image/jpeg" };
}

function storagePathFromPublicUrl(url: string, accountId: string): string | null {
  const index = url.indexOf(LOGOS_PUBLIC_PREFIX);
  if (index === -1) return null;
  const path = url.slice(index + LOGOS_PUBLIC_PREFIX.length).split("?")[0];
  // Nunca archivos de otra cuenta ni los de la galería (gallery-assets/).
  return path.startsWith(`${accountId}/img-`) ? path : null;
}

// Una plantilla duplicada o creada desde la galería copia section.config
// tal cual, o sea que varias secciones pueden apuntar al MISMO archivo.
// Por eso un archivo solo se borra cuando ninguna sección de la cuenta
// lo sigue usando (se llama DESPUÉS de haber quitado la referencia).
async function removeUnusedSectionImageFiles(
  supabase: SupabaseClient,
  accountId: string,
  urls: string[],
) {
  const candidates = new Set(urls.map((url) => storagePathFromPublicUrl(url, accountId)).filter((path): path is string => !!path));
  if (candidates.size === 0) return;

  const { data: sections } = await supabase
    .from("template_sections")
    .select("config")
    .eq("account_id", accountId)
    .eq("type", "imagenes");
  for (const section of sections ?? []) {
    for (const image of getImagenesConfig((section.config ?? {}) as Record<string, unknown>).images) {
      const path = storagePathFromPublicUrl(image.url, accountId);
      if (path) candidates.delete(path);
    }
  }
  if (candidates.size === 0) return;

  // No hay política de borrado en Storage para el usuario; la autorización
  // ya la dio requireOwner + RLS al editar la sección.
  const { error } = await createAdminClient().storage.from("logos").remove([...candidates]);
  // Un archivo huérfano es solo espacio perdido: no vale la pena
  // tumbar la acción del usuario por esto.
  if (error) console.error("No se pudieron borrar imágenes de sección:", error.message);
}

async function loadImagenesSection(supabase: SupabaseClient, sectionId: string) {
  const { data: section, error } = await supabase
    .from("template_sections")
    .select("type, template_id, config")
    .eq("id", sectionId)
    .single();
  if (error || !section) throw new Error("No se encontró la sección.");
  if (section.type !== "imagenes") throw new Error("Esta sección no es de imágenes.");
  return section as { type: string; template_id: string; config: Record<string, unknown> };
}

async function saveImagenesConfig(
  supabase: SupabaseClient,
  templateId: string,
  sectionId: string,
  config: Record<string, unknown>,
  next: ImagenesConfig,
) {
  const { error } = await supabase
    .from("template_sections")
    .update({ config: { ...config, imagenes: next } })
    .eq("id", sectionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/plantillas/${templateId}`);
}

export async function uploadSectionImage(templateId: string, sectionId: string, formData: FormData) {
  const { supabase, account } = await requireOwner();
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) throw new Error("No se seleccionó ningún archivo.");
  if (!SECTION_IMAGE_TYPES.includes(file.type)) throw new Error("Usa una imagen PNG, JPG o WebP.");
  if (file.size > SECTION_IMAGE_MAX_BYTES) throw new Error("La imagen pesa más de 4 MB. Redúcela e inténtalo de nuevo.");

  const section = await loadImagenesSection(supabase, sectionId);
  if (section.template_id !== templateId) throw new Error("La sección no pertenece a esta plantilla.");
  const current = getImagenesConfig(section.config);
  if (current.images.length >= MAX_IMAGES_PER_SECTION) {
    throw new Error(`Máximo ${MAX_IMAGES_PER_SECTION} imágenes por sección.`);
  }

  // Límite del plan Gratis: se cuenta en TODA la plantilla, no por
  // sección — si no, se esquivaría con varias secciones de 1 imagen.
  const usage = await getPlanUsage(account.accountId);
  if (usage.effective === "gratis") {
    const { data: siblings } = await supabase
      .from("template_sections")
      .select("config")
      .eq("template_id", templateId)
      .eq("type", "imagenes");
    const total = (siblings ?? []).reduce(
      (sum, row) => sum + getImagenesConfig((row.config ?? {}) as Record<string, unknown>).images.length,
      0,
    );
    if (total >= FREE_LIMITS.imagesPerTemplate) throw new Error(IMAGE_LIMIT_MESSAGE);
  }

  let normalized;
  try {
    normalized = await normalizeSectionImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new Error("No se pudo leer la imagen. Prueba con otro archivo.");
  }

  const path = `${account.accountId}/img-${randomUUID()}.${normalized.ext}`;
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, normalized.data, { contentType: normalized.contentType });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(path);

  const alt = file.name.replace(/\.[^.]+$/, "").slice(0, 80);
  try {
    await saveImagenesConfig(supabase, templateId, sectionId, section.config, {
      ...current,
      images: [...current.images, { url: publicUrl, alt }],
    });
  } catch (e) {
    // Si no se pudo guardar la referencia, el archivo quedaría huérfano.
    await createAdminClient().storage.from("logos").remove([path]);
    throw e;
  }
}

export async function removeSectionImage(templateId: string, sectionId: string, index: number) {
  const { supabase, account } = await requireOwner();
  const section = await loadImagenesSection(supabase, sectionId);
  const current = getImagenesConfig(section.config);
  const removed = current.images[index];
  if (!removed) return;

  await saveImagenesConfig(supabase, templateId, sectionId, section.config, {
    ...current,
    images: current.images.filter((_, i) => i !== index),
  });
  await removeUnusedSectionImageFiles(supabase, account.accountId, [removed.url]);
}

export async function moveSectionImage(templateId: string, sectionId: string, index: number, direction: -1 | 1) {
  const { supabase } = await requireOwner();
  const section = await loadImagenesSection(supabase, sectionId);
  const current = getImagenesConfig(section.config);
  const target = index + direction;
  if (!current.images[index] || target < 0 || target >= current.images.length) return;

  const images = [...current.images];
  [images[index], images[target]] = [images[target], images[index]];
  await saveImagenesConfig(supabase, templateId, sectionId, section.config, { ...current, images });
}

// Ajustes de la cuadrícula (columnas, separación, alto, ajuste). Llega
// solo lo que cambió: se combina con la config leída ahora mismo, no con
// la que el navegador tenía en pantalla. Se normalizan con
// getImagenesConfig: lo que llegue fuera de rango no se guarda tal cual.
export async function updateSectionImagenes(
  templateId: string,
  sectionId: string,
  settings: Partial<Pick<ImagenesConfig, "columns" | "gap" | "height" | "fit" | "align">>,
) {
  const { supabase } = await requireOwner();
  const section = await loadImagenesSection(supabase, sectionId);
  const current = getImagenesConfig(section.config);
  const next = getImagenesConfig({ imagenes: { ...current, ...settings } });
  await saveImagenesConfig(supabase, templateId, sectionId, section.config, next);
}

// Vista previa en vivo del editor: arma un presupuesto de ejemplo en
// memoria y reutiliza el mismo renderer HTML del PDF real, sin pasar
// por Puppeteer (ver htmlToPdf) — así se puede llamar en cada cambio,
// con debounce, sin el costo de abrir un navegador headless en cada
// tecla. No toca la base de datos: template/pages ya vienen tal cual
// los tiene el cliente (pages siempre reflejan lo último guardado;
// template.theme puede ser un borrador todavía sin "Guardar" en la
// pestaña Tema). requireOwner() es solo para exigir sesión — no hay
// ninguna lectura ni escritura que necesite alcance por cuenta.
export async function renderTemplatePreviewHtml(
  template: Template,
  pages: PageWithSections[],
  catalogFields: FieldCatalogEntry[],
): Promise<string> {
  const { account } = await requireOwner();
  const presupuesto = buildTemplateEditorPreviewPresupuesto(template, pages, account.currency);
  return renderPresupuestoPdfHtml(presupuesto, template, pages, catalogFields, { preview: true });
}
