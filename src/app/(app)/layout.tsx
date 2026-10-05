import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { exitSupportMode } from "@/lib/support/actions";
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

  const cookieStore = await cookies();
  const inSupportMode = cookieStore.get("support_mode")?.value === "1";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {inSupportMode && (
        <div
          style={{
            background: "#92400e",
            color: "#fff",
            padding: "0.5rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          <span>Modo soporte: viendo como {account.accountName}</span>
          <form action={exitSupportMode}>
            <button
              type="submit"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.4)",
                color: "#fff",
                borderRadius: 6,
                padding: "0.15rem 0.6rem",
                font: "inherit",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Salir
            </button>
          </form>
        </div>
      )}
      <AppHeader accountName={account.accountName} signOutAction={signOut} isPlatformAdmin={account.isPlatformAdmin} />
      <main style={{ flex: 1, padding: "1.5rem", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: CONTENT_MAX_WIDTH }}>{children}</div>
      </main>
    </div>
  );
}
