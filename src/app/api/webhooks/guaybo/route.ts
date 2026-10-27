import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processGuayboEvent } from "@/lib/guaybo/process";

// Guaybo no ofrece un campo de secreto en su pantalla de Webhooks, así que
// la URL lleva un token (?token=...) que se compara con GUAYBO_WEBHOOK_TOKEN.
// Es la autenticación mínima mientras no haya firma verificable.
function hasValidToken(request: Request): boolean {
  const expected = process.env.GUAYBO_WEBHOOK_TOKEN;
  const received = new URL(request.url).searchParams.get("token");
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

// Se guardan los headers para descubrir si Guaybo manda alguna firma, pero
// sin las credenciales de sesión ni autorización.
function safeHeaders(request: Request): Record<string, string> {
  const result: Record<string, string> = {};
  request.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (lower === "cookie") return;
    result[lower] = lower === "authorization" ? "[presente]" : value;
  });
  return result;
}

export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const rawBody = await request.text();

  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Cuerpo no JSON: queda solo en raw_body.
  }

  // Todavía no se conoce el formato real; se prueban los nombres
  // habituales del tipo de evento (purchase.created, payment.updated...).
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const eventType = [record.type, record.event, record.eventType, record.event_type].find(
    (value): value is string => typeof value === "string",
  );

  const admin = createAdminClient();
  const { data: stored, error } = await admin
    .from("guaybo_webhook_events")
    .insert({
      event_type: eventType ?? null,
      raw_body: rawBody,
      payload,
      headers: safeHeaders(request),
    })
    .select("id")
    .single();

  // 500 hace que Guaybo reintente (si reintenta); un 200 con el aviso
  // perdido sería peor que un duplicado.
  if (error || !stored) return NextResponse.json({ error: "No se pudo guardar el evento." }, { status: 500 });

  // Un fallo al procesar NO devuelve error a Guaybo: el aviso ya quedó
  // guardado y se puede revisar o reprocesar; un reintento no lo arreglaría.
  try {
    const outcome = await processGuayboEvent(stored.id, payload);
    await admin.from("guaybo_webhook_events").update({ processed: true, outcome }).eq("id", stored.id);
  } catch (processError) {
    await admin
      .from("guaybo_webhook_events")
      .update({ error: processError instanceof Error ? processError.message : "Error al procesar." })
      .eq("id", stored.id);
  }

  return NextResponse.json({ ok: true });
}
