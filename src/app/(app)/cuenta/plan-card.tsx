import Link from "next/link";
import { FREE_LIMITS, PLAN_LABELS } from "@/lib/plans";
import type { getPlanUsage } from "@/lib/plan-usage";

type Usage = Awaited<ReturnType<typeof getPlanUsage>>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-VE", { dateStyle: "medium" });
}

const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: "0.9rem" };

export function PlanCard({ usage }: { usage: Usage }) {
  const isFree = usage.effective === "gratis";

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        boxShadow: "var(--sh-soft)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ fontWeight: 700 }}>Plan</div>
        <span
          style={{
            padding: "0.3rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.7rem",
            fontWeight: 700,
            background: isFree ? "var(--bg)" : "var(--accent-soft)",
            color: isFree ? "var(--ink-dim)" : "var(--accent)",
          }}
        >
          {PLAN_LABELS[usage.effective]}
        </span>
      </div>

      {usage.expired && usage.expiresAt && (
        <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
          Tu plan {PLAN_LABELS[usage.plan]} venció el {formatDate(usage.expiresAt)}. Tus datos siguen intactos, pero
          vuelves a los límites del plan Gratis.
        </p>
      )}
      {!usage.expired && usage.expiresAt && (
        <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem", margin: 0 }}>Vigente hasta el {formatDate(usage.expiresAt)}.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={rowStyle}>
          <span>Plantillas</span>
          <span>{isFree ? `${usage.templates} de ${FREE_LIMITS.templates}` : `${usage.templates} (sin límite)`}</span>
        </div>
        <div style={rowStyle}>
          <span>Presupuestos</span>
          <span>{isFree ? `${usage.presupuestos} de ${FREE_LIMITS.presupuestos}` : `${usage.presupuestos} (sin límite)`}</span>
        </div>
        <div style={rowStyle}>
          <span>Colaboradores</span>
          <span>
            {usage.collaborators} de {usage.collaboratorLimit}
          </span>
        </div>
      </div>

      {isFree && (
        <Link href="/#precios" style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.9rem" }}>
          Ver planes Pioneros →
        </Link>
      )}
    </div>
  );
}
