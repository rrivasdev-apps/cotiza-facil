import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import { buildAccountExport } from "@/lib/account-export";

export const runtime = "nodejs";
// Una cuenta con miles de presupuestos pagina varias veces la base.
export const maxDuration = 60;

// Solo el propietario: la copia incluye los datos de todos los clientes y
// los correos de los colaboradores.
export async function GET() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!account.isOwner) return NextResponse.json({ error: "Solo el propietario puede exportar los datos." }, { status: 403 });

  try {
    const zip = await buildAccountExport(supabase, account.accountId, createAdminClient());
    const day = new Date().toISOString().slice(0, 10);
    return new Response(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="cotiza-facil-datos-${day}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Exportación de datos falló:", error);
    return NextResponse.json({ error: "No se pudo generar la exportación. Intenta de nuevo." }, { status: 500 });
  }
}
