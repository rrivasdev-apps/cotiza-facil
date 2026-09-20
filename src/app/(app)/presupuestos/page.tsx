import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PRESUPUESTO_STATUS_LABELS } from "@/lib/types";
import type { Presupuesto } from "@/lib/types";
import { duplicatePresupuesto } from "@/lib/presupuestos/actions";

export default async function PresupuestosPage() {
  const supabase = await createClient();
  const { data: presupuestos } = await supabase
    .from("presupuestos")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Presupuestos</h1>
        <Link
          href="/presupuestos/new"
          style={{
            background: "var(--ink)",
            color: "#fff",
            borderRadius: 8,
            padding: "0.5rem 1rem",
            fontWeight: 600,
          }}
        >
          Nuevo presupuesto
        </Link>
      </div>

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none" }}>
        {((presupuestos ?? []) as Presupuesto[]).map((p) => (
          <li
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--card)",
              borderRadius: 12,
              boxShadow: "var(--sh-soft)",
            }}
          >
            <Link
              href={`/presupuestos/${p.id}`}
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.25rem",
              }}
            >
              <span>
                <span style={{ fontWeight: 600 }}>{p.client_name}</span>{" "}
                <span style={{ color: "var(--ink-dim)" }}>· {p.client_email}</span>
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  color: "var(--ink-dim)",
                }}
              >
                {PRESUPUESTO_STATUS_LABELS[p.status]}
              </span>
            </Link>
            <form action={duplicatePresupuesto.bind(null, p.id)} style={{ paddingRight: "1rem" }}>
              <button
                type="submit"
                style={{
                  background: "transparent",
                  border: "1px solid var(--ink-dim)",
                  color: "var(--ink-dim)",
                  borderRadius: 8,
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Duplicar
              </button>
            </form>
          </li>
        ))}
        {presupuestos?.length === 0 && (
          <p style={{ color: "var(--ink-dim)" }}>Todavía no hay presupuestos.</p>
        )}
      </ul>
    </div>
  );
}
