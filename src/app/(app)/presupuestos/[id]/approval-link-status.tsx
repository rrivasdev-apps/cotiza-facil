"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renewApprovalLink, revokeApprovalLink } from "@/lib/presupuestos/actions";
import { APPROVAL_LINK_TTL_DAYS } from "@/lib/presupuestos/approval-link";

const buttonStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--ink-dim)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 1rem",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "var(--sh-soft)",
};

// `expired` lo calcula el servidor: si se comparara con Date.now() acá,
// el HTML del servidor y el del navegador podrían discrepar.
export function ApprovalLinkStatus({
  presupuestoId,
  expiresAt,
  expired,
}: {
  presupuestoId: string;
  expiresAt: string | null;
  expired: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"revoke" | "renew" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "revoke" | "renew") => {
    if (kind === "revoke" && !window.confirm("¿Revocar el enlace? Tu cliente ya no podrá aprobar ni rechazar con él.")) {
      return;
    }
    setPending(kind);
    setError(null);
    const result = kind === "revoke" ? await revokeApprovalLink(presupuestoId) : await renewApprovalLink(presupuestoId);
    if (result.error) setError(result.error);
    else router.refresh();
    setPending(null);
  };

  const date = expiresAt
    ? new Date(expiresAt).toLocaleDateString("es-AR", { timeZone: "America/Caracas" })
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", color: "var(--ink-dim)", fontSize: "0.9rem" }}>
      <span>
        {expired
          ? `El enlace de aprobación venció${date ? ` el ${date}` : ""}.`
          : date
            ? `El enlace de aprobación vence el ${date}.`
            : "El enlace de aprobación no tiene vencimiento."}
      </span>
      <button type="button" style={buttonStyle} disabled={pending !== null} onClick={() => run("renew")}>
        {pending === "renew" ? "Renovando..." : `Renovar ${APPROVAL_LINK_TTL_DAYS} días`}
      </button>
      {!expired && (
        <button type="button" style={buttonStyle} disabled={pending !== null} onClick={() => run("revoke")}>
          {pending === "revoke" ? "Revocando..." : "Revocar enlace"}
        </button>
      )}
      {error && <span style={{ color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
