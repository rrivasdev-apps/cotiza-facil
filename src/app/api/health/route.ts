import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lo consulta el monitor de uptime (UptimeRobot) sin sesión. Un 200 de la
// landing solo prueba que Vercel sirve la app; esta ruta además toca
// Supabase, así que avisa si la base de datos está caída. No devuelve el
// detalle del error: es una ruta pública.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { error } = await createAdminClient().from("accounts").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Health check falló:", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
