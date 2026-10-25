"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { encrypt, decrypt } from "@/lib/crm/crypto";
import { syncToCRM } from "@/lib/crm/sync";

const PROVIDER = "crm_facil";

async function requireMember() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
}

// La configuración del CRM guarda credenciales: solo el propietario.
// El colaborador solo puede reintentar el envío de un presupuesto.
async function requireOwner() {
  const result = await requireMember();
  if (!result.account.isOwner) throw new Error("Solo el propietario del workspace puede hacer esto.");
  return result;
}

export type CrmIntegrationConfig = {
  endpointUrl: string;
  secretLast4: string | null;
  isActive: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
};

export type CrmSyncLogEntry = {
  id: string;
  presupuestoId: string;
  attempt: number;
  status: "success" | "failed" | "pending";
  httpStatus: number | null;
  error: string | null;
  createdAt: string;
};

// Nunca selecciona secret_encrypted — este Server Action corre en el
// servidor pero su resultado sí viaja al navegador, así que la
// columna cifrada ni siquiera se pide (ver adaptación documentada en
// el plan: reemplaza la vista "integrations_public" de la spec).
export async function getCrmIntegration(): Promise<{
  config: CrmIntegrationConfig | null;
  log: CrmSyncLogEntry[];
}> {
  const { supabase, account } = await requireOwner();

  const { data: integration } = await supabase
    .from("integrations")
    .select("endpoint_url, secret_last4, is_active, last_success_at, last_error")
    .eq("account_id", account.accountId)
    .eq("provider", PROVIDER)
    .maybeSingle();

  const { data: log } = await supabase
    .from("crm_sync_log")
    .select("id, presupuesto_id, attempt, status, http_status, error, created_at")
    .eq("account_id", account.accountId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    config: integration
      ? {
          endpointUrl: integration.endpoint_url,
          secretLast4: integration.secret_last4,
          isActive: integration.is_active,
          lastSuccessAt: integration.last_success_at,
          lastError: integration.last_error,
        }
      : null,
    log: (log ?? []).map((row) => ({
      id: row.id,
      presupuestoId: row.presupuesto_id,
      attempt: row.attempt,
      status: row.status,
      httpStatus: row.http_status,
      error: row.error,
      createdAt: row.created_at,
    })),
  };
}

export async function saveCrmIntegration(params: {
  endpointUrl: string;
  secret?: string;
  isActive: boolean;
}): Promise<{ error?: string }> {
  const endpointUrl = params.endpointUrl.trim();
  if (!endpointUrl.startsWith("https://")) return { error: "El endpoint debe empezar con https://." };
  if (params.secret !== undefined && params.secret.trim().length < 8) {
    return { error: "El secreto debe tener al menos 8 caracteres." };
  }

  const { supabase, account } = await requireOwner();

  // No se puede resolver esto con un solo upsert(): Postgres evalúa el
  // NOT NULL de secret_encrypted sobre la fila candidata del INSERT
  // antes de llegar a resolver el ON CONFLICT, así que un upsert sin
  // esa columna falla aunque la fila ya exista y vaya a actualizarse.
  // Por eso update/insert quedan separados a mano.
  const { data: existing } = await supabase
    .from("integrations")
    .select("id")
    .eq("account_id", account.accountId)
    .eq("provider", PROVIDER)
    .maybeSingle();

  const fields: Record<string, unknown> = {
    endpoint_url: endpointUrl,
    is_active: params.isActive,
  };
  if (params.secret) {
    const trimmed = params.secret.trim();
    // Devuelve {error} en vez de dejar que encrypt() lance (p. ej. si
    // falta INTEGRATIONS_ENC_KEY en el entorno): un throw en un Server
    // Action se redacta en producción y el usuario solo ve "This page
    // couldn't load" sin saber qué pasó.
    try {
      fields.secret_encrypted = encrypt(trimmed);
    } catch (encryptError) {
      return { error: encryptError instanceof Error ? encryptError.message : "No se pudo cifrar el secreto." };
    }
    fields.secret_last4 = trimmed.slice(-4);
  }

  if (existing) {
    const { error } = await supabase.from("integrations").update(fields).eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    if (!params.secret) return { error: "Falta el secreto compartido." };
    const { error } = await supabase
      .from("integrations")
      .insert({ account_id: account.accountId, provider: PROVIDER, ...fields });
    if (error) return { error: error.message };
  }

  revalidatePath("/cuenta");
  return {};
}

export async function testCrmIntegration(): Promise<{ ok: boolean; message: string }> {
  const { supabase, account } = await requireOwner();

  const { data: integration } = await supabase
    .from("integrations")
    .select("id, endpoint_url, secret_encrypted")
    .eq("account_id", account.accountId)
    .eq("provider", PROVIDER)
    .maybeSingle();
  if (!integration) return { ok: false, message: "Todavía no configuraste el endpoint y el secreto." };

  let secret: string;
  try {
    secret = decrypt(integration.secret_encrypted);
  } catch (decryptError) {
    return { ok: false, message: decryptError instanceof Error ? decryptError.message : "No se pudo leer el secreto guardado." };
  }

  const payload = {
    externalId: `test-${account.accountId}`,
    number: "TEST",
    title: "Prueba de conexión Cotiza Fácil",
    total: 0,
    currency: account.currency,
    status: "borrador" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: `${process.env.APP_URL}/`,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(integration.endpoint_url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      await supabase
        .from("integrations")
        .update({ last_success_at: new Date().toISOString(), last_error: null })
        .eq("id", integration.id);
      return { ok: true, message: "Conexión exitosa." };
    }

    const body = await response.text().catch(() => "");
    const message = `Error ${response.status}: ${body || "sin detalle"}`;
    await supabase.from("integrations").update({ last_error: message.slice(0, 1000) }).eq("id", integration.id);
    return { ok: false, message };
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo conectar.";
    await supabase.from("integrations").update({ last_error: message.slice(0, 1000) }).eq("id", integration.id);
    return { ok: false, message };
  }
}

export async function resyncAllPresupuestos(): Promise<{ count: number }> {
  const { supabase, account } = await requireOwner();

  const { data: presupuestos } = await supabase
    .from("presupuestos")
    .select("id")
    .eq("account_id", account.accountId);

  const ids = (presupuestos ?? []).map((p) => p.id);
  const BATCH_SIZE = 20;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((id) => syncToCRM(id)));
    if (i + BATCH_SIZE < ids.length) await new Promise((resolve) => setTimeout(resolve, 300));
  }

  revalidatePath("/cuenta");
  revalidatePath("/presupuestos");
  return { count: ids.length };
}

export async function retrySyncNow(presupuestoId: string): Promise<void> {
  const { supabase, account } = await requireMember();

  // syncToCRM usa el service role (ve cualquier presupuesto), así que la
  // pertenencia al workspace activo se comprueba acá antes de llamarlo.
  const { data: presupuesto } = await supabase
    .from("presupuestos")
    .select("id")
    .eq("id", presupuestoId)
    .eq("account_id", account.accountId)
    .maybeSingle();
  if (!presupuesto) throw new Error("Presupuesto no encontrado.");

  await syncToCRM(presupuestoId);
  revalidatePath("/presupuestos");
}
