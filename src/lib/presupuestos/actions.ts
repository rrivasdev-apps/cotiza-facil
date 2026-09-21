"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { generateAndStorePresupuestoPdf, createPresupuestoPdfSignedUrl } from "@/lib/presupuestos/pdf";
import { sendPresupuestoEmail } from "@/lib/email/resend";
import { numberToWordsEs } from "@/lib/number-to-words";
import { evaluateFormula } from "@/lib/formula";
import { grandTotal, sectionTotalFieldId } from "@/lib/presupuesto-items";
import type { DataType, PresupuestoItems, SectionType, PresupuestoData } from "@/lib/types";

const PDF_SIGNED_URL_TTL_SECONDS = 60 * 10;

async function requireAccount() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
}

type SectionFieldForFill = {
  field_catalog_id: string | null;
  required: boolean;
  number_in_words_of: string | null;
  formula: string | null;
  field: { data_type: DataType } | { data_type: DataType }[] | null;
};

// Arma el `data` jsonb de un presupuesto a partir del form, en tres
// pasadas (arrancando de `seedData` — hoy, el Total General de cada
// sección tabla_items, ver buildSectionTotalsSeed más abajo — para que
// una fórmula o un "valor en letras" puedan referenciarlo igual que
// cualquier campo real):
// 1. Campos normales (los que el usuario llenó a mano).
// 2. Campos "calculados con fórmula" (moneda) — no vienen en el form,
//    se resuelven a partir de otros campos ya cargados. Hasta 5
//    pasadas para permitir que una fórmula referencie el resultado de
//    otra (ej. Subtotal = Precio*Cantidad, Total = Subtotal+Impuesto)
//    sin necesitar un ordenamiento topológico completo.
// 3. Campos "valor en letras" (texto) — se calculan al final para
//    poder deletrear un total ya calculado en el paso 2.
// Las "líneas combinadas" (field_catalog_id null) no tienen dato
// propio — se descartan acá, se calculan solas al renderizar.
function buildPresupuestoData(
  formData: FormData,
  sectionFields: SectionFieldForFill[],
  seedData: PresupuestoData,
): { data: PresupuestoData } | { error: string } {
  const data: PresupuestoData = { ...seedData };
  const fillable = sectionFields.filter(
    (sf): sf is SectionFieldForFill & { field_catalog_id: string } => sf.field_catalog_id !== null,
  );

  for (const sf of fillable) {
    if (sf.number_in_words_of || sf.formula !== null) continue;

    const fieldInfo = Array.isArray(sf.field) ? sf.field[0] : sf.field;
    const dataType = fieldInfo?.data_type;
    const raw = formData.get(`field_${sf.field_catalog_id}`);
    const rawStr = raw == null ? "" : String(raw);

    if (dataType === "lista") {
      const items = rawStr
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (sf.required && items.length === 0) return { error: "Falta completar un campo obligatorio." };
      data[sf.field_catalog_id] = items;
    } else {
      const value = rawStr.trim();
      if (sf.required && !value) return { error: "Falta completar un campo obligatorio." };
      data[sf.field_catalog_id] = value;
    }
  }

  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const sf of fillable) {
      if (!sf.formula) continue;
      const result = evaluateFormula(sf.formula, data);
      const next = result === null ? "" : String(result);
      if (data[sf.field_catalog_id] !== next) {
        data[sf.field_catalog_id] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const sf of fillable) {
    if (!sf.number_in_words_of) continue;
    const source = data[sf.number_in_words_of];
    const amount = Number(Array.isArray(source) ? source[0] : source);
    data[sf.field_catalog_id] = Number.isFinite(amount) ? numberToWordsEs(amount) : "";
  }

  return { data };
}

// Los ítems de una sección "tabla_items" viajan en el form como un
// único input oculto por sección (items_<sectionId>) con el array
// entero en JSON — ver ItemsEditor. No hay validación de required acá:
// una sección sin ítems queda con array vacío, no bloquea el guardado.
function buildPresupuestoItems(
  formData: FormData,
  sections: { id: string; type: SectionType }[],
): PresupuestoItems {
  const items: PresupuestoItems = {};
  for (const section of sections) {
    if (section.type !== "tabla_items") continue;
    const raw = formData.get(`items_${section.id}`);
    if (typeof raw !== "string") continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items[section.id] = parsed
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => ({
            concepto: String(item.concepto ?? ""),
            cantidad: String(item.cantidad ?? ""),
            precioUnitario: String(item.precioUnitario ?? ""),
          }));
      }
    } catch {
      // JSON inválido — no debería pasar viniendo del propio formulario, se ignora.
    }
  }
  return items;
}

// Materializa el Total General de cada sección tabla_items como si
// fuera el valor de un campo más, bajo su id sintético (ver
// sectionTotalFieldId) — así una fórmula ("Total * 1.16" para el IVA)
// o un "valor en letras" lo pueden leer de `data` igual que cualquier
// campo real, sin necesitar su propio mecanismo de resolución.
function buildSectionTotalsSeed(items: PresupuestoItems, sections: { id: string; type: SectionType }[]): PresupuestoData {
  const seed: PresupuestoData = {};
  for (const section of sections) {
    if (section.type !== "tabla_items") continue;
    seed[sectionTotalFieldId(section.id)] = String(grandTotal(items[section.id] ?? []));
  }
  return seed;
}

// Resuelve template.total_field_id contra el `data` ya calculado —
// mismo id que una fórmula/línea combinada usarían, sea un
// field_catalog_id real o el Total General sintético de una
// tabla_items. Se guarda aparte en presupuestos.total_amount para que
// reportes futuros puedan sumar/agrupar sin depender de la estructura
// de cada plantilla (ver migración 20260927000000).
function resolveTotalAmount(data: PresupuestoData, totalFieldId: string | null): number | null {
  if (!totalFieldId) return null;
  const raw = data[totalFieldId];
  const amount = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(amount) ? amount : null;
}

export async function createPresupuesto(_prevState: string | null, formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim();

  if (!templateId) return "Elegí una plantilla.";
  if (!clientName) return "El nombre del cliente es obligatorio.";
  if (!clientEmail) return "El correo del cliente es obligatorio.";

  const { supabase, account } = await requireAccount();

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("total_field_id")
    .eq("id", templateId)
    .single();
  if (templateError) return `No se pudo leer la plantilla: ${templateError.message}`;

  const { data: sections, error: sectionsError } = await supabase
    .from("template_sections")
    .select("id, type")
    .eq("template_id", templateId);
  if (sectionsError) return `No se pudo leer la plantilla: ${sectionsError.message}`;

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: sectionFields, error: fieldsError } = await supabase
    .from("template_section_fields")
    .select("field_catalog_id, required, number_in_words_of, formula, field:field_catalog!template_section_fields_field_catalog_id_fkey(data_type)")
    .in("section_id", sectionIds.length > 0 ? sectionIds : ["00000000-0000-0000-0000-000000000000"]);
  if (fieldsError) return `No se pudo leer los campos de la plantilla: ${fieldsError.message}`;

  const items = buildPresupuestoItems(formData, (sections ?? []) as { id: string; type: SectionType }[]);
  const seedData = buildSectionTotalsSeed(items, (sections ?? []) as { id: string; type: SectionType }[]);
  const result = buildPresupuestoData(formData, (sectionFields ?? []) as SectionFieldForFill[], seedData);
  if ("error" in result) return result.error;
  const { data } = result;
  const totalAmount = resolveTotalAmount(data, template.total_field_id);

  const { data: presupuesto, error } = await supabase
    .from("presupuestos")
    .insert({
      account_id: account.accountId,
      template_id: templateId,
      client_name: clientName,
      client_email: clientEmail,
      data,
      items,
      total_amount: totalAmount,
    })
    .select("id")
    .single();

  if (error) return `No se pudo crear el presupuesto: ${error.message}`;

  redirect(`/presupuestos/${presupuesto.id}`);
}

export async function updatePresupuesto(
  presupuestoId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim();

  if (!clientName) return "El nombre del cliente es obligatorio.";
  if (!clientEmail) return "El correo del cliente es obligatorio.";

  const { supabase } = await requireAccount();

  const { data: presupuesto, error: presupuestoError } = await supabase
    .from("presupuestos")
    .select("template_id")
    .eq("id", presupuestoId)
    .single();
  if (presupuestoError || !presupuesto) return "Presupuesto no encontrado.";

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("total_field_id")
    .eq("id", presupuesto.template_id)
    .single();
  if (templateError) return `No se pudo leer la plantilla: ${templateError.message}`;

  const { data: sections, error: sectionsError } = await supabase
    .from("template_sections")
    .select("id, type")
    .eq("template_id", presupuesto.template_id);
  if (sectionsError) return `No se pudo leer la plantilla: ${sectionsError.message}`;

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: sectionFields, error: fieldsError } = await supabase
    .from("template_section_fields")
    .select("field_catalog_id, required, number_in_words_of, formula, field:field_catalog!template_section_fields_field_catalog_id_fkey(data_type)")
    .in("section_id", sectionIds.length > 0 ? sectionIds : ["00000000-0000-0000-0000-000000000000"]);
  if (fieldsError) return `No se pudo leer los campos de la plantilla: ${fieldsError.message}`;

  const items = buildPresupuestoItems(formData, (sections ?? []) as { id: string; type: SectionType }[]);
  const seedData = buildSectionTotalsSeed(items, (sections ?? []) as { id: string; type: SectionType }[]);
  const result = buildPresupuestoData(formData, (sectionFields ?? []) as SectionFieldForFill[], seedData);
  if ("error" in result) return result.error;
  const { data } = result;
  const totalAmount = resolveTotalAmount(data, template.total_field_id);

  const { error } = await supabase
    .from("presupuestos")
    .update({ client_name: clientName, client_email: clientEmail, data, items, total_amount: totalAmount })
    .eq("id", presupuestoId);
  if (error) return `No se pudo actualizar el presupuesto: ${error.message}`;

  revalidatePath(`/presupuestos/${presupuestoId}`);
  redirect(`/presupuestos/${presupuestoId}`);
}

// Copia cliente + datos rellenados en un presupuesto nuevo, en estado
// "borrador" (status/pdf_path/sent_at/approved_at vuelven a sus
// defaults por columna — no se copian del original).
export async function duplicatePresupuesto(presupuestoId: string) {
  const { supabase, account } = await requireAccount();

  const { data: presupuesto, error } = await supabase
    .from("presupuestos")
    .select("*")
    .eq("id", presupuestoId)
    .single();
  if (error || !presupuesto) throw new Error(error?.message ?? "Presupuesto no encontrado.");

  const { data: newPresupuesto, error: insertError } = await supabase
    .from("presupuestos")
    .insert({
      account_id: account.accountId,
      template_id: presupuesto.template_id,
      client_name: presupuesto.client_name,
      client_email: presupuesto.client_email,
      data: presupuesto.data,
      items: presupuesto.items,
      total_amount: presupuesto.total_amount,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/presupuestos");
  redirect(`/presupuestos/${newPresupuesto.id}`);
}

export async function getPresupuestoPdfUrl(presupuestoId: string): Promise<string> {
  const { supabase } = await requireAccount();

  const { data: presupuesto, error } = await supabase
    .from("presupuestos")
    .select("pdf_path")
    .eq("id", presupuestoId)
    .single();
  if (error || !presupuesto?.pdf_path) throw new Error("Todavía no se exportó un PDF para este presupuesto.");

  return createPresupuestoPdfSignedUrl(presupuesto.pdf_path, PDF_SIGNED_URL_TTL_SECONDS);
}

export async function sendPresupuesto(presupuestoId: string) {
  const { supabase, account } = await requireAccount();

  // Regenera el PDF al momento de enviar, para que el adjunto siempre
  // refleje los datos actuales del presupuesto (no una exportación vieja).
  const { pdfBuffer, presupuesto, template } = await generateAndStorePresupuestoPdf(presupuestoId);

  await sendPresupuestoEmail(presupuesto, template, pdfBuffer, account.senderEmail);

  const { error } = await supabase
    .from("presupuestos")
    .update({ status: "enviado", sent_at: new Date().toISOString() })
    .eq("id", presupuestoId);
  if (error) throw new Error(error.message);

  revalidatePath(`/presupuestos/${presupuestoId}`);
  revalidatePath("/presupuestos");
}
