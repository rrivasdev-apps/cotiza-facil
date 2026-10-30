"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelAccountDeletion, requestAccountDeletion } from "@/lib/account-deletion/actions";
import { DELETION_GRACE_DAYS } from "@/lib/account-deletion/purge";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  borderRadius: 12,
  boxShadow: "var(--sh-soft)",
  padding: "1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const buttonStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  border: "none",
  borderRadius: 8,
  padding: "0.6rem 1.25rem",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

export function EliminarCuentaCard({
  accountName,
  deletionRequestedAt,
}: {
  accountName: string;
  deletionRequestedAt: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ error?: string }>) => {
    setPending(true);
    setError(null);
    const result = await action();
    if (result.error) setError(result.error);
    else {
      setConfirming(false);
      setTypedName("");
      router.refresh();
    }
    setPending(false);
  };

  if (deletionRequestedAt) {
    const deleteOn = new Date(new Date(deletionRequestedAt).getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
    return (
      <div style={cardStyle}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--danger)" }}>Eliminación programada</h2>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem" }}>
          El {deleteOn.toLocaleDateString("es-VE", { dateStyle: "long", timeZone: "America/Caracas" })} se borrarán
          todos los datos de este workspace. Hasta entonces puedes seguir usándolo, y puedes cancelar cuando quieras.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(cancelAccountDeletion)}
          style={{ ...buttonStyle, background: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
        >
          {pending ? "Cancelando..." : "Cancelar la eliminación"}
        </button>
        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Eliminar mi cuenta</h2>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem" }}>
          Borra todos los datos de este workspace: plantillas, presupuestos, clientes y archivos. Tienes{" "}
          {DELETION_GRACE_DAYS} días para arrepentirte y cancelarlo; pasado ese plazo no se puede deshacer. Antes,
          descarga tu copia con &ldquo;Exportar mis datos&rdquo;.
        </p>
      </div>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          style={{ ...buttonStyle, background: "transparent", color: "var(--danger)", boxShadow: "var(--sh-soft)" }}
        >
          Eliminar mi cuenta...
        </button>
      ) : (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem" }}>
            <span>
              Para confirmar, escribe el nombre de tu negocio: <strong>{accountName}</strong>
            </span>
            <input type="text" value={typedName} onChange={(event) => setTypedName(event.target.value)} autoComplete="off" />
          </label>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={pending || typedName.trim() === ""}
              onClick={() => run(() => requestAccountDeletion(typedName))}
              style={{ ...buttonStyle, background: "var(--danger)", color: "#fff" }}
            >
              {pending ? "Programando..." : `Programar eliminación en ${DELETION_GRACE_DAYS} días`}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setConfirming(false);
                setTypedName("");
                setError(null);
              }}
              style={{ ...buttonStyle, background: "transparent", color: "var(--ink-dim)", boxShadow: "var(--sh-soft)" }}
            >
              Volver
            </button>
          </div>
        </>
      )}
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}
