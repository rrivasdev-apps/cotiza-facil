import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncToCRM } from "@/lib/crm/sync";

// Llamado por pg_cron/pg_net cada 10 min (ver la migración
// crm_integration.sql, sección comentada) — no por un usuario ni por
// la propia app, así que se autentica con un secreto compartido en
// vez de una sesión.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
