import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/aprobar" es el link que recibe el cliente por correo — no tiene
// sesión, así que no puede exigir login como el resto de la app.
// "/soporte/entrar" es el mismo caso pero para el link de acceso de
// soporte (ver src/lib/support/actions.ts): se abre en una ventana de
// incógnito sin sesión previa — es justo esa ruta la que crea una.
// "/api/crm/retry" tampoco tiene sesión — la llama pg_cron desde
// Supabase, autenticada con su propio CRON_SECRET (ver esa route), no
// con cookies de sesión.
// "/" (landing) y "/signup" tampoco. "/" NO puede matchear por
// startsWith como el resto — cualquier ruta empieza con "/", así que
// se compara aparte con igualdad exacta más abajo.
// "/invitacion" es el link que recibe un colaborador invitado — puede no
// tener cuenta todavía (la página le ofrece crear su usuario).
// "/api/webhooks" lo llama Guaybo (avisos de pago), sin sesión; la propia
// route se protege con un token en la URL.
// "/api/health" lo consulta el monitor de uptime, sin sesión.
// "/terminos" y "/privacidad" se leen antes de registrarse.
// "/verificar" es el link de confirmación de correo; se abre desde el
// correo, a veces en otro navegador sin sesión.
const PUBLIC_PATHS = ["/login", "/signup", "/aprobar", "/soporte/entrar", "/api/crm/retry", "/invitacion", "/api/webhooks", "/api/health", "/verificar", "/terminos", "/privacidad"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath =
    request.nextUrl.pathname === "/" || PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Ya logueado: la landing y las páginas de auth no le sirven de
  // nada — lo mandamos directo a la app. Si ya tiene plantillas, entra
  // al dashboard (Inicio); si no tiene ninguna, entra a Plantillas,
  // donde ve el asistente de onboarding en vez de un dashboard vacío.
  if (user && (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const { count } = await supabase.from("templates").select("id", { count: "exact", head: true });
    const url = request.nextUrl.clone();
    url.pathname = (count ?? 0) > 0 ? "/inicio" : "/plantillas";
    return NextResponse.redirect(url);
  }

  return response;
}
