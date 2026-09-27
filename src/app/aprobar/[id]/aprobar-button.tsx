"use client";

import { useState } from "react";
import { approvePresupuesto } from "@/lib/presupuestos/public-actions";
import type { PresupuestoStatus } from "@/lib/types";

export function AprobarButton({
  presupuestoId,
  status,
  approvedAt,
}: {
  presupuestoId: string;
  status: PresupuestoStatus;
  approvedAt: string | null;
}) {
  const [approved, setApproved] = useState(status === "aprobado");
  const [approvedAtLocal, setApprovedAtLocal] = useState(approvedAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setPending(true);
    setError(null);
    const result = await approvePresupuesto(presupuestoId);
    if (result.error) {
      setError(result.error);
    } else {
      setApproved(true);
      setApprovedAtLocal(new Date().toISOString());
    }
    setPending(false);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    borderRadius: 12,
    boxShadow: "var(--sh-soft)",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    textAlign: "center",
  };

  if (approved) {
    const fecha = approvedAtLocal
      ? new Date(approvedAtLocal).toLocaleDateString("es-AR", { timeZone: "America/Caracas" })
      : null;
    return (
      <div style={cardStyle}>
        <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1.1rem" }}>✓ Presupuesto aprobado</p>
        {fecha && <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem" }}>Aprobado el {fecha}.</p>}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <p style={{ color: "var(--ink-dim)" }}>¿Confirmás que apruebas este presupuesto?</p>
      <button
        type="button"
        onClick={approve}
        disabled={pending}
        style={{
          background: "var(--btn-primary-bg)",
          color: "var(--btn-primary-fg)",
          border: "none",
          borderRadius: 8,
          padding: "0.75rem 2rem",
          fontWeight: 700,
          fontSize: "1rem",
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Aprobando..." : "Aprobar presupuesto"}
      </button>
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}
