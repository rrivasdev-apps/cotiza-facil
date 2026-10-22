"use client";

import Link from "next/link";
import { PRESUPUESTO_STATUS_LABELS } from "@/lib/types";
import type { Presupuesto, PresupuestoStatus } from "@/lib/types";
import { formatMoney } from "@/lib/presupuesto-items";
import { ListToolbar, compareText, useListControls } from "@/components/list-toolbar";
import type { SortOption } from "@/components/list-toolbar";
import { PresupuestoActionsMenu } from "./presupuesto-actions-menu";

const STATUS_COLORS: Record<PresupuestoStatus, { bg: string; fg: string }> = {
  borrador: { bg: "var(--bg)", fg: "var(--ink-dim)" },
  enviado: { bg: "var(--info-soft)", fg: "var(--info)" },
  aprobado: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  rechazado: { bg: "var(--danger-soft)", fg: "var(--danger)" },
};

// Orden del ciclo de vida, no alfabético: borrador → enviado → aprobado/rechazado.
const STATUS_RANK: Record<PresupuestoStatus, number> = {
  borrador: 0,
  enviado: 1,
  aprobado: 2,
  rechazado: 3,
};

const STATUS_OPTIONS = (Object.keys(PRESUPUESTO_STATUS_LABELS) as PresupuestoStatus[]).map((value) => ({
  value,
  label: PRESUPUESTO_STATUS_LABELS[value],
}));

const SORT_OPTIONS: SortOption<Presupuesto>[] = [
  {
    key: "fecha",
    label: "Fecha",
    defaultDir: "desc",
    compare: (a, b) => a.created_at.localeCompare(b.created_at),
  },
  {
    key: "cliente",
    label: "Cliente",
    defaultDir: "asc",
    compare: (a, b) => compareText(a.client_name, b.client_name),
  },
  {
    key: "monto",
    label: "Monto",
    defaultDir: "desc",
    // Sin monto va como 0 para que no rompa la comparación.
    compare: (a, b) => (a.total_amount ?? 0) - (b.total_amount ?? 0),
  },
  {
    key: "estatus",
    label: "Estatus",
    defaultDir: "asc",
    compare: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
  },
];

const searchText = (presupuesto: Presupuesto) => presupuesto.client_name;
const statusOf = (presupuesto: Presupuesto) => presupuesto.status;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function PresupuestosList({ presupuestos }: { presupuestos: Presupuesto[] }) {
  const { visible, filtering, toolbarProps } = useListControls({
    items: presupuestos,
    searchText,
    sortOptions: SORT_OPTIONS,
    statusOf,
  });

  return (
    <>
      <ListToolbar
        {...toolbarProps}
        searchPlaceholder="Buscar por cliente…"
        statusOptions={STATUS_OPTIONS}
      />
      {visible.length === 0 ? (
        <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem" }}>
          {filtering ? "Ningún presupuesto coincide con el filtro." : "Todavía no hay presupuestos."}
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            background: "var(--card)",
            boxShadow: "var(--sh-soft)",
            // Sin overflow:hidden a propósito: recortaría el menú "⋯" de la
            // fila (con una sola fila no hay dónde abrirlo sin salirse).
            // Las filas no tienen fondo propio, así que no hace falta para
            // redondear las esquinas.
          }}
        >
          {visible.map((p, i) => {
            const colors = STATUS_COLORS[p.status];
            return (
              <div
                key={p.id}
                className="presupuesto-row"
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: i < visible.length - 1 ? "1px solid var(--line)" : "none",
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
                    {p.crm_sync_status === "failed" && (
                      <span title="No se pudo enviar a CRM Fácil" style={{ marginLeft: "0.4rem", color: "var(--danger)" }}>
                        ⚠
                      </span>
                    )}
                  </span>
                </Link>
                <div className="presupuesto-row-menu">
                  <PresupuestoActionsMenu
                    presupuestoId={p.id}
                    clientName={p.client_name}
                    crmSyncStatus={p.crm_sync_status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
