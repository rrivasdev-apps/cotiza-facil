"use client";

import { useState } from "react";
import { approvePresupuesto, rejectPresupuesto } from "@/lib/presupuestos/public-actions";
import type { PresupuestoStatus } from "@/lib/types";

export function AprobarButton({
  presupuestoId,
  status,
  approvedAt,
  rejectedAt,
}: {
  presupuestoId: string;
  status: PresupuestoStatus;
  approvedAt: string | null;
  rejectedAt: string | null;
}) {
  const [resolved, setResolved] = useState<"aprobado" | "rechazado" | null>(
    status === "aprobado" ? "aprobado" : status === "rechazado" ? "rechazado" : null,
  );
  const [resolvedAtLocal, setResolvedAtLocal] = useState(status === "rechazado" ? rejectedAt : approvedAt);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [pending, setPending] = useState<"aprobar" | "rechazar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setPending("aprobar");
    setError(null);
    const result = await approvePresupuesto(presupuestoId);
    if (result.error) {
      setError(result.error);
    } else {
      setResolved("aprobado");
      setResolvedAtLocal(new Date().toISOString());
    }
    setPending(null);
  };

  const reject = async () => {
    setPending("rechazar");
    setError(null);
    const result = await rejectPresupuesto(presupuestoId);
    if (result.error) {
      setError(result.error);
    } else {
      setResolved("rechazado");
      setResolvedAtLocal(new Date().toISOString());
    }
    setPending(null);
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

  if (resolved === "aprobado") {
    const fecha = resolvedAtLocal
      ? new Date(resolvedAtLocal).toLocaleDateString("es-AR", { timeZone: "America/Caracas" })
      : null;
    return (
      <div style={cardStyle}>
        <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1.1rem" }}>✓ Presupuesto aprobado</p>
        {fecha && <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem" }}>Aprobado el {fecha}.</p>}
      </div>
    );
  }

  if (resolved === "rechazado") {
    const fecha = resolvedAtLocal
      ? new Date(resolvedAtLocal).toLocaleDateString("es-AR", { timeZone: "America/Caracas" })
      : null;
    return (
      <div style={cardStyle}>
        <p style={{ color: "var(--danger)", fontWeight: 700, fontSize: "1.1rem" }}>Presupuesto rechazado</p>
        {fecha && <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem" }}>Rechazado el {fecha}.</p>}
      </div>
    );
  }

  if (confirmingReject) {
    return (
      <div style={cardStyle}>
        <p style={{ color: "var(--ink-dim)" }}>¿Confirmas que rechazas este presupuesto?</p>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="button"
            onClick={reject}
            disabled={pending === "rechazar"}
            style={{
              background: "var(--danger)",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "0.75rem 1.5rem",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: pending === "rechazar" ? "default" : "pointer",
            }}
          >
            {pending === "rechazar" ? "Rechazando..." : "Sí, rechazar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingReject(false)}
            style={{
              background: "var(--card)",
              color: "var(--ink)",
              border: "1px solid var(--line-strong)",
              borderRadius: 8,
              padding: "0.75rem 1.5rem",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Volver
          </button>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <p style={{ color: "var(--ink-dim)" }}>¿Qué decides sobre este presupuesto?</p>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={approve}
          disabled={pending === "aprobar"}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: 8,
            padding: "0.75rem 2rem",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: pending === "aprobar" ? "default" : "pointer",
          }}
        >
          {pending === "aprobar" ? "Aprobando..." : "Aprobar presupuesto"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingReject(true)}
          style={{
            background: "transparent",
            color: "var(--danger)",
            border: "1px solid var(--line-strong)",
            borderRadius: 8,
            padding: "0.75rem 1.5rem",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Rechazar
        </button>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}
