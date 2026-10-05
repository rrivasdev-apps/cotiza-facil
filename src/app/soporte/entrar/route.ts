import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Redime el link de un solo uso que arma enterAsAccount (ver
// src/lib/support/actions.ts). Corre fuera del grupo (app) a
// propósito: la ventana de incógnito donde se abre todavía no tiene
// sesión. No usa el createClient() compartido (que lee/escribe
// cookies vía next/headers) — en un route handler, lo que sí anda
// siempre es leer de request.cookies y escribir directo sobre la
// respuesta que se termina devolviendo, así la sesión nueva queda
// atada a ESTA respuesta sin depender de un merge implícito.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (!tokenHash) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(new URL("/plantillas", request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Marca de solo UI (no es la barrera de seguridad real — esa es el
  // propio flujo de enterAsAccount + el registro en support_sessions):
  // le dice a AppLayout que muestre el aviso de "Modo soporte" con un
  // botón de salir.
  response.cookies.set("support_mode", "1", { path: "/", httpOnly: false, sameSite: "lax" });
  return response;
}
