"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import { generateAndStorePresupuestoPdf, createPresupuestoPdfSignedUrl } from "@/lib/presupuestos/pdf";
import { sendPresupuestoEmail } from "@/lib/email/resend";
import { renderPresupuestoEmailHtml } from "@/lib/email/render-presupuesto-email";
import { numberToWordsEs } from "@/lib/number-to-words";
import { evaluateFormula } from "@/lib/formula";
import { formatMoney, grandTotal, sectionTotalFieldId } from "@/lib/presupuesto-items";
import type { DataType, ItemConceptValue, PresupuestoItems, SectionType, PresupuestoData } from "@/lib/types";

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
  number_in_words_include_amount: boolean;
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
    if (!Number.isFinite(amount)) {
      data[sf.field_catalog_id] = "";
      continue;
    }
    const words = numberToWordsEs(amount, { exactosWhenWhole: sf.number_in_words_include_amount });
    data[sf.field_catalog_id] = sf.number_in_words_include_amount ? `${words} (${formatMoney(amount)})` : words;
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

// Recuerda cada "Concepto" de ítem que se cargue, sin que el usuario
// tenga que activar ni tocar nada — a diferencia de un campo del
// catálogo, "Concepto" no es configurable por plantilla, así que no
// tiene sentido pedirle a cada cuenta que marque "usar valores
// guardados" en algo que ni siquiera ve como campo. Se inserta de a
// uno e ignora el 23505 (duplicado insensible a mayúsculas) en vez de
// usar upsert: el índice único es sobre lower(value), una expresión
// que el onConflict de supabase-js no puede apuntar directo.
//
// Devuelve solo las filas RECIÉN creadas (no las que ya existían) —
// saveItemConceptsNow las usa para sumarlas al estado local del
// desplegable sin esperar a releer toda la lista del servidor.
async function saveConceptValues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  values: string[],
): Promise<ItemConceptValue[]> {
  const seen = new Set<string>();
  const saved: ItemConceptValue[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    const { data, error } = await supabase
      .from("item_concept_values")
      .insert({ account_id: accountId, value: trimmed })
      .select()
      .single();
    if (!error && data) {
      saved.push(data);
    } else if (error && error.code !== "23505") {
      console.error("No se pudo guardar el concepto de ítem:", error.message);
    }
  }
  return saved;
}

async function saveItemConcepts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  items: PresupuestoItems,
) {
  const values = Object.values(items).flatMap((rows) => rows.map((item) => item.concepto));
  await saveConceptValues(supabase, accountId, values);
}

// Llamada directo desde ItemsEditor (no como parte de guardar el
// formulario entero) justo al pedir una fila nueva — así, el
// "Concepto" de la fila que se acaba de terminar queda disponible
// para las filas siguientes DEL MISMO presupuesto, en vez de recién
// aparecer en el próximo. Guardar el presupuesto entero sigue
// guardando igual (ver saveItemConcepts) — eso cubre la última fila
// (nunca pasa por "pedir una fila nueva") y el caso de una sola fila.
export async function saveItemConceptsNow(values: string[]) {
  const { supabase, account } = await requireAccount();
  return saveConceptValues(supabase, account.accountId, values);
}

// ClientPicker manda client_id vacío cuando el usuario elige "nuevo
// cliente" (incluso si antes había uno elegido) — ahí se crea la fila
// en clientes recién en este momento. Si el correo ya existe (23505,
// ej. se tipeó el mismo correo de un cliente ya guardado sin elegirlo
// de la lista) no se bloquea el presupuesto: se busca ese cliente y se
// usa su id, igual que si lo hubiera elegido del desplegable.
async function resolveClientId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  formData: FormData,
): Promise<{ clientId: string | null } | { error: string }> {
  const clientId = String(formData.get("client_id") ?? "").trim();
  if (clientId) return { clientId };

  const name = String(formData.get("client_name") ?? "").trim();
  const email = String(formData.get("client_email") ?? "").trim();
  const phone = String(formData.get("client_phone") ?? "").trim();
  const address = String(formData.get("client_address") ?? "").trim();

  const { data: newClient, error } = await supabase
    .from("clientes")
    .insert({ account_id: accountId, name, email, phone: phone || null, address: address || null })
    .select("id")
    .single();

  if (!error) return { clientId: newClient.id };
  if (error.code !== "23505") return { error: `No se pudo guardar el cliente: ${error.message}` };

  const { data: existing, error: lookupError } = await supabase
    .from("clientes")
    .select("id")
    .eq("account_id", accountId)
    .ilike("email", email)
    .single();
  if (lookupError || !existing) {
    return { error: "Ya existe un cliente con ese correo, pero no se pudo encontrar — recarga la página e inténtalo de nuevo." };
  }
  return { clientId: existing.id };
}

export async function createPresupuesto(_prevState: string | null, formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim();
  const clientPhone = String(formData.get("client_phone") ?? "").trim();
  const clientAddress = String(formData.get("client_address") ?? "").trim();

  if (!templateId) return "Elige una plantilla.";
  if (!clientName) return "El nombre del cliente es obligatorio.";
  if (!clientEmail) return "El correo del cliente es obligatorio.";

  const { supabase, account } = await requireAccount();

  const clientResult = await resolveClientId(supabase, account.accountId, formData);
  if ("error" in clientResult) return clientResult.error;
  const { clientId } = clientResult;

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
    .select("field_catalog_id, required, number_in_words_of, number_in_words_include_amount, formula, field:field_catalog!template_section_fields_field_catalog_id_fkey(data_type)")
    .in("section_id", sectionIds.length > 0 ? sectionIds : ["00000000-0000-0000-0000-000000000000"]);
  if (fieldsError) return `No se pudo leer los campos de la plantilla: ${fieldsError.message}`;

  const items = buildPresupuestoItems(formData, (sections ?? []) as { id: string; type: SectionType }[]);
  const seedData = buildSectionTotalsSeed(items, (sections ?? []) as { id: string; type: SectionType }[]);
  const result = buildPresupuestoData(formData, (sectionFields ?? []) as SectionFieldForFill[], seedData);
  if ("error" in result) return result.error;
  const { data } = result;
  const totalAmount = resolveTotalAmount(data, template.total_field_id);

  const { data: presupuestoNumber, error: numberError } = await supabase.rpc("claim_next_presupuesto_number", {
    p_account_id: account.accountId,
  });
  if (numberError) return `No se pudo asignar el N° de presupuesto: ${numberError.message}`;

  const { data: presupuesto, error } = await supabase
    .from("presupuestos")
    .insert({
      account_id: account.accountId,
      template_id: templateId,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || null,
      client_address: clientAddress || null,
      data,
      items,
      total_amount: totalAmount,
      number: presupuestoNumber,
    })
    .select("id")
    .single();

  if (error) return `No se pudo crear el presupuesto: ${error.message}`;

  await saveItemConcepts(supabase, account.accountId, items);

  redirect(`/presupuestos/${presupuesto.id}`);
}

export async function updatePresupuesto(
  presupuestoId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim();
  const clientPhone = String(formData.get("client_phone") ?? "").trim();
  const clientAddress = String(formData.get("client_address") ?? "").trim();

  if (!clientName) return "El nombre del cliente es obligatorio.";
  if (!clientEmail) return "El correo del cliente es obligatorio.";

  const { supabase, account } = await requireAccount();

  const clientResult = await resolveClientId(supabase, account.accountId, formData);
  if ("error" in clientResult) return clientResult.error;
  const { clientId } = clientResult;

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
    .select("field_catalog_id, required, number_in_words_of, number_in_words_include_amount, formula, field:field_catalog!template_section_fields_field_catalog_id_fkey(data_type)")
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
    .update({
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || null,
      client_address: clientAddress || null,
      data,
      items,
      total_amount: totalAmount,
    })
    .eq("id", presupuestoId);
  if (error) return `No se pudo actualizar el presupuesto: ${error.message}`;

  await saveItemConcepts(supabase, account.accountId, items);

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

  const { data: presupuestoNumber, error: numberError } = await supabase.rpc("claim_next_presupuesto_number", {
    p_account_id: account.accountId,
  });
  if (numberError) throw new Error(`No se pudo asignar el N° de presupuesto: ${numberError.message}`);

  const { data: newPresupuesto, error: insertError } = await supabase
    .from("presupuestos")
    .insert({
      account_id: account.accountId,
      template_id: presupuesto.template_id,
      client_id: presupuesto.client_id,
      client_name: presupuesto.client_name,
      client_email: presupuesto.client_email,
      client_phone: presupuesto.client_phone,
      client_address: presupuesto.client_address,
      data: presupuesto.data,
      items: presupuesto.items,
      total_amount: presupuesto.total_amount,
      number: presupuestoNumber,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/presupuestos");
  redirect(`/presupuestos/${newPresupuesto.id}`);
}

// El PDF en storage queda huérfano si falla el borrado (best-effort:
// no bloquea el borrado del presupuesto en sí, que es lo que el
// usuario pidió y lo único que le importa ver reflejado).
export async function deletePresupuesto(presupuestoId: string) {
  const { supabase } = await requireAccount();

  const { data: presupuesto, error: fetchError } = await supabase
    .from("presupuestos")
    .select("pdf_path")
    .eq("id", presupuestoId)
    .single();
  if (fetchError || !presupuesto) throw new Error(fetchError?.message ?? "Presupuesto no encontrado.");

  const { error } = await supabase.from("presupuestos").delete().eq("id", presupuestoId);
  if (error) throw new Error(error.message);

  if (presupuesto.pdf_path) {
    const admin = createAdminClient();
    await admin.storage.from("presupuestos-pdf").remove([presupuesto.pdf_path]);
  }

  revalidatePath("/presupuestos");
}

export async function deleteItemConcept(id: string) {
  const { supabase } = await requireAccount();
  const { error } = await supabase.from("item_concept_values").delete().eq("id", id);
  if (error) throw new Error(error.message);
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

// Server Actions invocadas con throw/catch pierden el mensaje real en
// producción — Next redacta las excepciones no capturadas del render de
// Server Components a un genérico "Minified React error #441" con solo un
// digest. Por eso estas dos devuelven { error } en vez de tirar: así el
// mensaje que el usuario ve es siempre el que armamos acá, no uno redactado.
type SendResult = { error: string } | { error?: undefined };

export async function sendPresupuesto(presupuestoId: string): Promise<SendResult> {
  try {
    const { supabase, account } = await requireAccount();

    // Regenera el PDF al momento de enviar, para que el adjunto siempre
    // refleje los datos actuales del presupuesto (no una exportación vieja).
    const { pdfBuffer, presupuesto, template } = await generateAndStorePresupuestoPdf(presupuestoId);

    const approvalUrl = `${process.env.APP_URL}/aprobar/${presupuestoId}`;
    await sendPresupuestoEmail(presupuesto, template, pdfBuffer, account.senderEmail, undefined, approvalUrl);

    const { error } = await supabase
      .from("presupuestos")
      .update({ status: "enviado", sent_at: new Date().toISOString() })
      .eq("id", presupuestoId);
    if (error) throw new Error(error.message);

    revalidatePath(`/presupuestos/${presupuestoId}`);
    revalidatePath("/presupuestos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ocurrió un error." };
  }
}

// Misma lógica que sendPresupuesto (mismo PDF adjunto, mismo cambio de
// estado) pero con el cuerpo del correo armado a partir de la
// plantilla en vez del texto plano de siempre — para mandar algo con
// más impacto visual cuando conviene (ver renderPresupuestoEmailHtml).
export async function sendPresupuestoHtml(presupuestoId: string): Promise<SendResult> {
  try {
    const { supabase, account } = await requireAccount();

    const { pdfBuffer, presupuesto, template, pages, catalogFields } = await generateAndStorePresupuestoPdf(presupuestoId);
    const approvalUrl = `${process.env.APP_URL}/aprobar/${presupuestoId}`;
    const html = renderPresupuestoEmailHtml(presupuesto, template, pages, catalogFields, approvalUrl);

    await sendPresupuestoEmail(presupuesto, template, pdfBuffer, account.senderEmail, html, approvalUrl);

    const { error } = await supabase
      .from("presupuestos")
      .update({ status: "enviado", sent_at: new Date().toISOString() })
      .eq("id", presupuestoId);
    if (error) throw new Error(error.message);

    revalidatePath(`/presupuestos/${presupuestoId}`);
    revalidatePath("/presupuestos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ocurrió un error." };
  }
}
