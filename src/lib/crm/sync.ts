import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crm/crypto";
import { buildQuotePayload } from "@/lib/crm/mapper";
import type { Presupuesto } from "@/lib/types";

const TIMEOUT_MS = 10_000;
// minutos de espera antes del próximo intento, indexado por intento (1-based) —
// su longitud (5) es el límite de reintentos: al agotarse, nextRetryAt
// devuelve null y el estado pasa a "failed".
const BACKOFF_MINUTES = [1, 5, 30, 120, 720];

function nextRetryAt(attempt: number): string | null {
  const minutes = BACKOFF_MINUTES[attempt - 1];
  if (minutes === undefined) return null;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function logAttempt(params: {
  accountId: string;
  presupuestoId: string;
  attempt: number;
  status: "success" | "failed" | "pending";
  httpStatus?: number;
  error?: string;
  payloadHash: string;
  nextRetryAt: string | null;
}) {
  const admin = createAdminClient();
  await admin.from("crm_sync_log").insert({
    account_id: params.accountId,
    presupuesto_id: params.presupuestoId,
    attempt: params.attempt,
    status: params.status,
    http_status: params.httpStatus ?? null,
    error: params.error ? params.error.slice(0, 1000) : null,
    payload_hash: params.payloadHash,
    next_retry_at: params.nextRetryAt,
  });
}

// Nunca lanza — un fallo de sincronización no puede tirar abajo el
// guardado del presupuesto que la disparó (ver los call sites en
// presupuestos/actions.ts y public-actions.ts, todos vía after()).
export async function syncToCRM(presupuestoId: string, attempt = 1): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: presupuesto, error: presupuestoError } = await admin
      .from("presupuestos")
      .select("*")
      .eq("id", presupuestoId)
      .single();
    if (presupuestoError || !presupuesto) return;

    const { data: integration, error: integrationError } = await admin
      .from("integrations")
      .select("*")
      .eq("account_id", presupuesto.account_id)
      .eq("provider", "crm_facil")
      .eq("is_active", true)
      .maybeSingle();
    if (integrationError || !integration) return;

    const { data: account } = await admin
      .from("accounts")
      .select("currency, name")
      .eq("id", presupuesto.account_id)
      .single();

    const payload = buildQuotePayload(presupuesto as Presupuesto, {
      currency: account?.currency ?? "USD",
      name: account?.name,
    });
    const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const secret = decrypt(integration.secret_encrypted);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(integration.endpoint_url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      const retryAt = nextRetryAt(attempt);
      const status = retryAt ? "pending" : "failed";
      await logAttempt({
        accountId: presupuesto.account_id,
        presupuestoId,
        attempt,
        status,
        error: fetchError instanceof Error ? fetchError.message : "Error de red.",
        payloadHash,
        nextRetryAt: retryAt,
      });
      await admin.from("presupuestos").update({ crm_sync_status: status === "pending" ? "not_synced" : "failed" }).eq("id", presupuestoId);
      return;
    }
    clearTimeout(timeout);

    if (response.ok) {
      await logAttempt({
        accountId: presupuesto.account_id,
        presupuestoId,
        attempt,
        status: "success",
        httpStatus: response.status,
        payloadHash,
        nextRetryAt: null,
      });
      await admin.from("presupuestos").update({ crm_sync_status: "synced" }).eq("id", presupuestoId);
      await admin
        .from("integrations")
        .update({ last_success_at: new Date().toISOString(), last_error: null })
        .eq("id", integration.id);
      return;
    }

    const body = await response.text().catch(() => "");

    if (response.status === 401 || response.status === 403) {
      await logAttempt({
        accountId: presupuesto.account_id,
        presupuestoId,
        attempt,
        status: "failed",
        httpStatus: response.status,
        error: body || "Secreto inválido.",
        payloadHash,
        nextRetryAt: null,
      });
      await admin.from("presupuestos").update({ crm_sync_status: "failed" }).eq("id", presupuestoId);
      await admin
        .from("integrations")
        .update({ last_error: "Secreto inválido — genera uno nuevo en CRM Fácil." })
        .eq("id", integration.id);
      return;
    }

    if (response.status === 400) {
      await logAttempt({
        accountId: presupuesto.account_id,
        presupuestoId,
        attempt,
        status: "failed",
        httpStatus: response.status,
        error: body,
        payloadHash,
        nextRetryAt: null,
      });
      await admin.from("presupuestos").update({ crm_sync_status: "failed" }).eq("id", presupuestoId);
      await admin.from("integrations").update({ last_error: body.slice(0, 1000) }).eq("id", integration.id);
      return;
    }

    // 429 / 5xx — reintentable
    const retryAt = nextRetryAt(attempt);
    const status = retryAt ? "pending" : "failed";
    await logAttempt({
      accountId: presupuesto.account_id,
      presupuestoId,
      attempt,
      status,
      httpStatus: response.status,
      error: body,
      payloadHash,
      nextRetryAt: retryAt,
    });
    await admin
      .from("presupuestos")
      .update({ crm_sync_status: status === "pending" ? "not_synced" : "failed" })
      .eq("id", presupuestoId);
    if (status === "failed") {
      await admin.from("integrations").update({ last_error: body.slice(0, 1000) }).eq("id", integration.id);
    }
  } catch (error) {
    // syncToCRM nunca propaga (no debe afectar al llamador), pero el error
    // queda en el log: p. ej. un APP_URL ausente haría fallar todo en silencio.
    console.error("syncToCRM falló:", error);
  }
}
