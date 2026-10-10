import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { formatMoney } from "@/lib/presupuesto-items";
import { PRESUPUESTO_STATUS_LABELS } from "@/lib/types";
import type { Presupuesto, PresupuestoStatus } from "@/lib/types";

type PeriodView = "mes" | "año";

const STATUS_COLORS: Record<PresupuestoStatus, { bg: string; fg: string }> = {
  borrador: { bg: "var(--bg)", fg: "var(--ink-dim)" },
  enviado: { bg: "var(--info-soft)", fg: "var(--info)" },
  aprobado: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  rechazado: { bg: "var(--danger-soft)", fg: "var(--danger)" },
};

function parseAnchor(raw: string | undefined): Date {
  if (raw) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function toParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function periodRange(view: PeriodView, anchor: Date) {
  if (view === "año") {
    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear() + 1, 0, 1);
    const prevStart = new Date(anchor.getFullYear() - 1, 0, 1);
    const nextStart = end;
    return { start, end, prevAnchor: prevStart, nextAnchor: nextStart };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const prevStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const nextStart = end;
  return { start, end, prevAnchor: prevStart, nextAnchor: nextStart };
}

function periodLabel(view: PeriodView, anchor: Date): string {
  const label =
    view === "año"
      ? anchor.toLocaleDateString("es-AR", { year: "numeric" })
      : anchor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function relativeDays(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Hace 1 mes" : `Hace ${months} meses`;
}

function periodHref(view: PeriodView, anchor: Date): string {
  return `/inicio?view=${view === "año" ? "ano" : "mes"}&date=${toParam(anchor)}`;
}

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  padding: "1.1rem",
  boxShadow: "var(--sh-soft)",
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--ink-dim)",
  fontWeight: 600,
  marginBottom: "0.4rem",
};

const cardValueStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.55rem",
  fontWeight: 700,
};

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view: PeriodView = params.view === "ano" ? "año" : "mes";
  const anchor = parseAnchor(params.date);
  const { start, end, prevAnchor, nextAnchor } = periodRange(view, anchor);
  const prevRange = periodRange(view, prevAnchor);

  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  const [{ data: periodRows }, { data: prevPeriodRows }, { data: recentRows }, { data: lastRow }] = await Promise.all([
    supabase
      .from("presupuestos")
      .select("id, client_id, client_name, status, total_amount, created_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
    supabase
      .from("presupuestos")
      .select("status, total_amount")
      .gte("created_at", prevRange.start.toISOString())
      .lt("created_at", prevRange.end.toISOString()),
    supabase
      .from("presupuestos")
      .select("id, client_name, status, total_amount, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("presupuestos").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const rows = (periodRows ?? []) as Pick<Presupuesto, "id" | "client_id" | "client_name" | "status" | "total_amount" | "created_at">[];
  const aprobados = rows.filter((r) => r.status === "aprobado");
  const pendientes = rows.filter((r) => r.status === "enviado");
  const rechazados = rows.filter((r) => r.status === "rechazado");
  const montoAprobado = aprobados.reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
  const montoPendiente = pendientes.reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
  const tasaAprobacion = rows.length > 0 ? Math.round((aprobados.length / rows.length) * 100) : null;

  const montoAprobadoPrev = ((prevPeriodRows ?? []) as Pick<Presupuesto, "status" | "total_amount">[])
    .filter((r) => r.status === "aprobado")
    .reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
  const delta =
    montoAprobadoPrev > 0 ? Math.round(((montoAprobado - montoAprobadoPrev) / montoAprobadoPrev) * 100) : null;

  const porCliente = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const key = r.client_id ?? `n:${r.client_name}`;
    const entry = porCliente.get(key);
    if (entry) entry.count += 1;
    else porCliente.set(key, { label: r.client_name, count: 1 });
  }
  let clienteTop: { label: string; count: number } | null = null;
  for (const entry of porCliente.values()) {
    if (!clienteTop || entry.count > clienteTop.count) clienteTop = entry;
  }

  const recent = (recentRows ?? []) as Pick<Presupuesto, "id" | "client_name" | "status" | "total_amount" | "created_at">[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: "0.2rem",
            }}
          >
            Hola de nuevo
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>{account?.accountName || "Inicio"}</h1>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 999, padding: 3, gap: 2 }}>
            <Link
              href={periodHref("mes", anchor)}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: "0.8rem",
                background: view === "mes" ? "var(--card)" : "transparent",
                color: view === "mes" ? "var(--ink)" : "var(--ink-dim)",
                boxShadow: view === "mes" ? "var(--sh-soft)" : "none",
              }}
            >
              Mes
            </Link>
            <Link
              href={periodHref("año", anchor)}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: "0.8rem",
                background: view === "año" ? "var(--card)" : "transparent",
                color: view === "año" ? "var(--ink)" : "var(--ink-dim)",
                boxShadow: view === "año" ? "var(--sh-soft)" : "none",
              }}
            >
              Año
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              border: "1px solid var(--line)",
              background: "var(--card)",
              borderRadius: "var(--radius-md)",
              padding: "0.4rem 0.5rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              boxShadow: "var(--sh-soft)",
            }}
          >
            <Link href={periodHref(view, prevAnchor)} aria-label="Período anterior" style={{ color: "var(--ink-dim)", padding: "0 0.3rem" }}>
              ‹
            </Link>
            <span style={{ minWidth: "7ch", textAlign: "center" }}>{periodLabel(view, anchor)}</span>
            <Link href={periodHref(view, nextAnchor)} aria-label="Período siguiente" style={{ color: "var(--ink-dim)", padding: "0 0.3rem" }}>
              ›
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "flex-start" }}>
        <div style={{ flex: "999 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div style={{ background: "var(--btn-primary-bg)", borderRadius: "var(--radius-lg)", padding: "1.4rem 1.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--btn-primary-fg)", opacity: 0.85 }}>
                Monto aprobado · {periodLabel(view, anchor).toLowerCase()}
              </div>
              <Link
                href="/presupuestos/new"
                style={{
                  flex: "0 0 auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "var(--card)",
                  color: "var(--ink)",
                  borderRadius: 999,
                  padding: "0.5rem 0.85rem",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  whiteSpace: "nowrap",
                }}
              >
                + Nuevo presupuesto
              </Link>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "2.1rem", fontWeight: 700, lineHeight: 1, color: "var(--btn-primary-fg)" }}>
              {formatMoney(montoAprobado)}
            </div>
            <div style={{ fontSize: "0.82rem", marginTop: "0.5rem", color: "var(--btn-primary-fg)", opacity: 0.85 }}>
              {delta !== null ? `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}% vs. período anterior · ` : ""}
              {aprobados.length} de {rows.length || 0} aprobados
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.7rem" }}>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Presupuestos creados</div>
              <div style={cardValueStyle}>{rows.length}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Aprobados</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                <div style={{ ...cardValueStyle, color: "var(--accent)" }}>{aprobados.length}</div>
                {tasaAprobacion !== null && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--accent)",
                      background: "var(--accent-soft)",
                      padding: "0.1rem 0.4rem",
                      borderRadius: 999,
                    }}
                  >
                    {tasaAprobacion}%
                  </div>
                )}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Pendientes de respuesta</div>
              <div style={{ ...cardValueStyle, color: "var(--info)" }}>{pendientes.length}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Rechazados</div>
              <div style={{ ...cardValueStyle, color: "var(--danger)" }}>{rechazados.length}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Cliente más frecuente</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.02rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {clienteTop?.label ?? "—"}
              </div>
              {clienteTop && (
                <div style={{ fontSize: "0.73rem", color: "var(--ink-faint)", marginTop: "0.1rem" }}>
                  {clienteTop.count} {clienteTop.count === 1 ? "presupuesto" : "presupuestos"}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.7rem" }}>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Monto pendiente</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700 }}>{formatMoney(montoPendiente)}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Último presupuesto</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700 }}>
                {lastRow ? relativeDays(lastRow.created_at as string) : "—"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link
              href="/plantillas"
              style={{
                flex: 1,
                minWidth: 150,
                textAlign: "center",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem",
                fontWeight: 600,
                fontSize: "0.86rem",
                color: "var(--ink)",
              }}
            >
              Ver plantillas
            </Link>
            <Link
              href="/clientes"
              style={{
                flex: 1,
                minWidth: 150,
                textAlign: "center",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem",
                fontWeight: 600,
                fontSize: "0.86rem",
                color: "var(--ink)",
              }}
            >
              Ver clientes
            </Link>
          </div>
        </div>

        <div style={{ flex: "1 1 300px", minWidth: 260, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", boxShadow: "var(--sh-soft)", overflow: "hidden" }}>
          <div style={{ padding: "1.1rem 1.2rem", borderBottom: "1px solid var(--line)", fontWeight: 700, fontSize: "0.95rem" }}>
            Últimos presupuestos
          </div>
          {recent.length === 0 ? (
            <p style={{ padding: "1.5rem 1.2rem", color: "var(--ink-faint)", fontSize: "0.85rem" }}>Todavía no tienes presupuestos.</p>
          ) : (
            recent.map((p) => {
              const colors = STATUS_COLORS[p.status];
              return (
                <Link
                  key={p.id}
                  href={`/presupuestos/${p.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.9rem 1.2rem",
                    borderBottom: "1px solid var(--line)",
                    color: "inherit",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.client_name}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--ink-faint)" }}>{relativeDays(p.created_at as string)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem", flex: "0 0 auto" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{formatMoney(p.total_amount ?? 0)}</div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.5rem",
                        borderRadius: 999,
                        background: colors.bg,
                        color: colors.fg,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {PRESUPUESTO_STATUS_LABELS[p.status]}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
