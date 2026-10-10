"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_prevState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return "Email o contraseña incorrectos.";
  }

  // Mismo criterio que updateSession en middleware.ts (si ya tiene
  // plantillas, Inicio; si no, Plantillas para el onboarding) —
  // resuelto acá mismo, no con un redirect("/") que dependa de que el
  // middleware lo re-redirija después: ese segundo salto es un fetch
  // a nivel de router (no una navegación de página completa), así que
  // la URL de la barra de direcciones se queda en "/" aunque el
  // contenido que se ve ya sea el de Inicio.
  const { count } = await supabase.from("templates").select("id", { count: "exact", head: true });
  redirect((count ?? 0) > 0 ? "/inicio" : "/plantillas");
}
