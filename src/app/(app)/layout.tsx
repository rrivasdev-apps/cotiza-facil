import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  if (!account) {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="app-header">
        <nav className="app-header-nav">
          <span style={{ fontWeight: 700 }}>Consola de Presupuestos</span>
          <Link href="/presupuestos" style={{ color: "var(--ink-dim)" }}>
            Presupuestos
          </Link>
          <Link href="/plantillas" style={{ color: "var(--ink-dim)" }}>
            Plantillas
          </Link>
          <Link href="/catalogo" style={{ color: "var(--ink-dim)" }}>
            Catálogo
          </Link>
        </nav>
        <div className="app-header-account">
          <Link
            href="/cuenta"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--ink-faint)",
              textTransform: "uppercase",
            }}
          >
            {account.accountName}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-dim)",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
    </div>
  );
}
