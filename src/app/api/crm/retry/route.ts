import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncToCRM } from "@/lib/crm/sync";

// Llamado por Vercel Cron cada 10 min (ver vercel.json) — no por un
// usuario ni por la propia app, así que se autentica con un secreto
// compartido en vez de una sesión. Vercel Cron manda un GET con
// "Authorization: Bearer <CRON_SECRET>"; POST queda para dispararlo a
// mano (curl) o desde pg_cron si algún día se prefiere (ver la sección
// comentada de la migración crm_integration.sql).
// Hasta 50 reintentos por corrida, cada uno con su propio timeout hacia el CRM.
export const maxDuration = 60;

export async function GET(request: Request) {
  return retryPendingSyncs(request);
}

export async function POST(request: Request) {
  return retryPendingSyncs(request);
}

async function retryPendingSyncs(request: Request) {
  const auth = request.headers.get("authorization");
  // Sin el chequeo de !secret, un CRON_SECRET ausente dejaba pasar a
  // quien mandara "Bearer undefined".
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: pending, error } = await admin
    .from("crm_sync_log")
    .select("id, presupuesto_id, attempt")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Un presupuesto puede tener varias filas "pending" viejas si el
  // cron se saltó una corrida — solo importa la última por presupuesto.
  const latestByPresupuesto = new Map<string, { logId: string; attempt: number }>();
  for (const row of pending ?? []) {
    latestByPresupuesto.set(row.presupuesto_id, { logId: row.id, attempt: row.attempt });
  }

  const processedLogIds: string[] = [];
  for (const [presupuestoId, { logId, attempt }] of latestByPresupuesto) {
    await syncToCRM(presupuestoId, attempt + 1);
    processedLogIds.push(logId);
  }

  // Marca las filas viejas como procesadas (next_retry_at a null) para
  // que el próximo tick del cron no las vuelva a tomar — el resultado
  // real del reintento ya quedó en una fila nueva que syncToCRM insertó.
  if (processedLogIds.length > 0) {
    await admin.from("crm_sync_log").update({ next_retry_at: null }).in("id", processedLogIds);
  }

  return NextResponse.json({ processed: latestByPresupuesto.size });
}
