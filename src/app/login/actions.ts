"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { activateWorkspace, getWorkspacesForUser } from "@/lib/workspaces/queries";

export async function signIn(_prevState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return "Email o contraseña incorrectos.";
  }

  // Viene de un link de invitación: se vuelve a esa página para que
  // acepte con la sesión recién iniciada. Solo rutas internas de
  // invitación, para que "next" no sirva de redirección abierta.
  const next = String(formData.get("next") ?? "");
  if (next.startsWith("/invitacion/") && !next.startsWith("//")) redirect(next);

  // Con varios workspaces (o ninguno propio, caso del colaborador recién
  // invitado) la persona elige dónde entrar. Se usa data.user porque un
  // cliente nuevo todavía no vería la sesión recién creada.
  const workspaces = await getWorkspacesForUser(data.user.id);
  if (workspaces.length !== 1) redirect("/elegir-workspace");

  // Un solo workspace: se activa sin preguntar. Hace falta antes de las
  // consultas de abajo, que dependen del workspace activo (RLS).
  if (!workspaces[0].isActive) await activateWorkspace(data.user.id, workspaces[0].accountId);

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
