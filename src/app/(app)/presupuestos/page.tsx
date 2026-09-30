import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { PRESUPUESTO_STATUS_LABELS } from "@/lib/types";
import type { Presupuesto, PresupuestoStatus } from "@/lib/types";
import { formatMoney } from "@/lib/presupuesto-items";
import { SparkleIcon } from "@/components/feature-icons";
import { HelpButton } from "@/components/help-button";
import { PresupuestoActionsMenu } from "./presupuesto-actions-menu";

const HELP_STEPS = [
  "Acá ves todos los presupuestos que has hecho, uno debajo del otro.",
  "Toca el botón verde \"Nuevo presupuesto\" para crear uno nuevo.",
  "Toca el nombre de un cliente para abrir ese presupuesto y ver los detalles.",
  "La palabra de color (\"Borrador\", \"Enviado\" o \"Aprobado\") te dice en qué paso va ese presupuesto.",
  "Toca el botón \"⋯\" de una fila para Duplicar ese presupuesto (hacer una copia) o Eliminarlo. Siempre te va a preguntar \"¿estás seguro?\" antes de borrar algo.",
];

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
  const account = await getCurrentAccount(supabase);
  const { data: presupuestos } = await supabase
    .from("presupuestos")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (presupuestos ?? []) as Presupuesto[];

  let defaultTemplateName: string | null = null;
  if (list.length === 0 && account?.defaultTemplateId) {
    const { data: defaultTemplate } = await supabase
      .from("templates")
      .select("name")
      .eq("id", account.defaultTemplateId)
      .maybeSingle();
    defaultTemplateName = defaultTemplate?.name ?? null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.5rem" }}>Presupuestos</h1>
            <HelpButton title="Cómo usar Presupuestos" steps={HELP_STEPS} />
          </div>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
            Gestiona los presupuestos que enviaste a tus clientes.
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "0.75rem",
            background: "var(--card)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-soft)",
            padding: "3rem 1.5rem",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-md)",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SparkleIcon size={26} />
          </div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Crea tu primer presupuesto</h2>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem", maxWidth: 380 }}>
            {defaultTemplateName
              ? <>Ya tienes <strong>&quot;{defaultTemplateName}&quot;</strong> lista — solo falta cargar los datos de un cliente.</>
              : "Ya tienes tu plantilla lista — solo falta cargar los datos de un cliente."}
          </p>
          <Link
            href="/presupuestos/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-fg)",
              borderRadius: "var(--radius-md)",
              padding: "0.65rem 1.25rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              marginTop: "0.5rem",
            }}
          >
            Nuevo presupuesto
          </Link>
        </div>
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
                className="presupuesto-row"
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: i < list.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                {/* display:contents hace que este <Link> no genere su propia
                    celda de grid — así el avatar, el nombre y el monto pueden
                    vivir cada uno en su área nombrada del grid del row, con
                    todo igual de clickeable, mientras el badge (otro Link
                    aparte, misma razón) y el menú "···" quedan en sus propias
                    áreas — necesario para que el badge pueda reubicarse bajo
                    el "···" en mobile sin arrastrar el resto del contenido. */}
                <Link href={`/presupuestos/${p.id}`} style={{ display: "contents" }}>
                  <span className="presupuesto-row-avatar">
                    {initials(p.client_name)}
                  </span>
                  <span className="presupuesto-row-name presupuesto-row-name-main">{p.client_name}</span>
                  <span className="presupuesto-row-amount">
                    {p.total_amount != null ? formatMoney(p.total_amount) : "—"}
                  </span>
                </Link>
                <Link href={`/presupuestos/${p.id}`} style={{ display: "contents" }}>
                  <span
                    className="presupuesto-row-badge"
                    style={{
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
                </Link>
                <div className="presupuesto-row-menu">
                  <PresupuestoActionsMenu presupuestoId={p.id} clientName={p.client_name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
