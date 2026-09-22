import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PRESUPUESTO_STATUS_LABELS } from "@/lib/types";
import type { Presupuesto, PresupuestoStatus } from "@/lib/types";
import { duplicatePresupuesto } from "@/lib/presupuestos/actions";
import { formatMoney } from "@/lib/presupuesto-items";

const STATUS_COLORS: Record<PresupuestoStatus, { bg: string; fg: string }> = {
  borrador: { bg: "var(--bg)", fg: "var(--ink-dim)" },
  enviado: { bg: "var(--info-soft)", fg: "var(--info)" },
  aprobado: { bg: "var(--accent-soft)", fg: "var(--accent)" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function PresupuestosPage() {
  const supabase = await createClient();
  const { data: presupuestos } = await supabase
    .from("presupuestos")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (presupuestos ?? []) as Presupuesto[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>Presupuestos</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
            Gestioná los presupuestos que enviaste a tus clientes.
          </p>
        </div>
        <Link
          href="/presupuestos/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            borderRadius: "var(--radius-md)",
            padding: "0.65rem 1.15rem",
            fontWeight: 700,
            fontSize: "0.875rem",
            boxShadow: "var(--sh-soft)",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Nuevo presupuesto
        </Link>
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--ink-dim)" }}>Todavía no hay presupuestos.</p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            background: "var(--card)",
            boxShadow: "var(--sh-soft)",
            overflow: "hidden",
          }}
        >
          {list.map((p, i) => {
            const colors = STATUS_COLORS[p.status];
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  borderBottom: i < list.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <Link
                  href={`/presupuestos/${p.id}`}
                  style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 0 }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      flex: "0 0 auto",
                      borderRadius: "999px",
                      background: "var(--accent-soft)",
                      color: "var(--accent-hover)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                    }}
                  >
                    {initials(p.client_name)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "0.9rem" }}>{p.client_name}</span>
                    <span
                      style={{
                        display: "block",
                        color: "var(--ink-dim)",
                        fontSize: "0.8rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.client_email}
                    </span>
                  </span>
                  <span
                    style={{
                      flex: "0 0 auto",
                      padding: "0.3rem 0.75rem",
                      borderRadius: "999px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      background: colors.bg,
                      color: colors.fg,
                    }}
                  >
                    {PRESUPUESTO_STATUS_LABELS[p.status]}
                  </span>
                  <span style={{ flex: "0 0 auto", width: 96, textAlign: "right", fontWeight: 700, fontSize: "0.9rem" }}>
                    {p.total_amount != null ? formatMoney(p.total_amount) : "—"}
                  </span>
                </Link>
                <form action={duplicatePresupuesto.bind(null, p.id)}>
                  <button
                    type="submit"
                    aria-label="Duplicar"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--line)",
                      color: "var(--ink-dim)",
                      borderRadius: "var(--radius-md)",
                      width: 34,
                      height: 34,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
