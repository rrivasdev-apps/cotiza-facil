import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/aprobar" es el link que recibe el cliente por correo — no tiene
// sesión, así que no puede exigir login como el resto de la app.
// "/" (landing) y "/signup" tampoco. "/" NO puede matchear por
// startsWith como el resto — cualquier ruta empieza con "/", así que
// se compara aparte con igualdad exacta más abajo.
const PUBLIC_PATHS = ["/login", "/signup", "/aprobar"];

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
  // nada — lo mandamos directo a la app.
  if (user && (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/plantillas";
    return NextResponse.redirect(url);
  }

  return response;
}
