import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { signOut } from "./actions";
import { AppHeader } from "./app-header";

// Ancho máximo compartido del área de contenido, centrada en pantallas
// anchas (antes quedaba pegada al borde izquierdo). Cada página sigue
// definiendo su propio maxWidth más angosto adentro (640 para listas,
// 816 para la vista previa, etc.) — este solo evita que en monitores
// grandes todo quede corrido a la izquierda con medio metro de vacío
// a la derecha.
const CONTENT_MAX_WIDTH = 960;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  if (!account) {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppHeader accountName={account.accountName} signOutAction={signOut} />
      <main style={{ flex: 1, padding: "1.5rem", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: CONTENT_MAX_WIDTH }}>{children}</div>
      </main>
    </div>
  );
}
