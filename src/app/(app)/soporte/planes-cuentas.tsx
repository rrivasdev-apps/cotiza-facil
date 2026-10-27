"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAccountPlan, type AccountPlanRow } from "@/lib/support/actions";
import { PLAN_LABELS, type Plan } from "@/lib/plans";

const fieldStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "0.4rem 0.6rem",
  font: "inherit",
  color: "var(--ink)",
};

const PLAN_OPTIONS = Object.keys(PLAN_LABELS) as Plan[];

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function PlanRow({ row }: { row: AccountPlanRow }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(row.plan);
  const [expires, setExpires] = useState(toDateInput(row.planExpiresAt));
  const [maxCollaborators, setMaxCollaborators] = useState(String(row.maxCollaborators));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPaid = plan === "pionero_mensual" || plan === "pionero_anual";
  const changed =
    plan !== row.plan ||
    expires !== toDateInput(row.planExpiresAt) ||
    (plan === "fundador" && maxCollaborators !== String(row.maxCollaborators));

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        // Fin del día en UTC: "vence el 15" sigue vigente durante el 15.
        const expiresAt = isPaid && expires ? `${expires}T23:59:59Z` : null;
        await setAccountPlan(row.accountId, plan, expiresAt, Number(maxCollaborators));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{row.accountName}</div>
        <div style={{ color: "var(--ink-dim)", fontSize: "0.8rem" }}>
          {row.ownerEmail} · {row.collaborators} colaborador{row.collaborators === 1 ? "" : "es"}
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <select value={plan} onChange={(e) => setPlan(e.target.value as Plan)} aria-label={`Plan de ${row.accountName}`} style={fieldStyle}>
          {PLAN_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PLAN_LABELS[option]}
            </option>
          ))}
        </select>
        {isPaid && (
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            aria-label={`Vencimiento del plan de ${row.accountName}`}
            style={fieldStyle}
          />
        )}
        {plan === "fundador" && (
          <input
            type="number"
            min={0}
            max={1000}
            value={maxCollaborators}
            onChange={(e) => setMaxCollaborators(e.target.value)}
            aria-label={`Tope de colaboradores de ${row.accountName}`}
            style={{ ...fieldStyle, width: 70 }}
          />
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending || !changed}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: 8,
            padding: "0.4rem 0.9rem",
            font: "inherit",
            fontWeight: 600,
            opacity: changed ? 1 : 0.5,
            cursor: pending || !changed ? "default" : "pointer",
          }}
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export function PlanesCuentas({ rows }: { rows: AccountPlanRow[] }) {
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        boxShadow: "var(--sh-soft)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div style={{ fontWeight: 700 }}>Plan de cada cuenta</div>
      <p style={{ fontSize: "0.8rem", color: "var(--ink-dim)", margin: 0 }}>
        Gratis: 1 plantilla, 5 presupuestos, sin colaboradores. Pioneros mensual: 1 colaborador. Pioneros anual: 5
        colaboradores. Al vencer, una cuenta Pioneros vuelve a comportarse como Gratis sin perder datos. Fundador:
        cuentas anteriores a los planes, sin límites de plantillas ni presupuestos.
      </p>
      {rows.map((row) => (
        <PlanRow key={row.accountId} row={row} />
      ))}
    </div>
  );
}
