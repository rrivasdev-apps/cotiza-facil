"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveCrmIntegration,
  testCrmIntegration,
  resyncAllPresupuestos,
  type CrmIntegrationConfig,
  type CrmSyncLogEntry,
} from "@/lib/crm/actions";

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  font: "inherit",
  color: "var(--ink)",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" });
}

const LOG_LABELS: Record<CrmSyncLogEntry["status"], string> = {
  success: "Enviado",
  failed: "Falló",
  pending: "Reintentando",
};

export function IntegracionCrmCard({
  config,
  log,
}: {
  config: CrmIntegrationConfig | null;
  log: CrmSyncLogEntry[];
}) {
  const router = useRouter();
  const [endpointUrl, setEndpointUrl] = useState(config?.endpointUrl ?? "");
  const [secret, setSecret] = useState("");
  const [replacingSecret, setReplacingSecret] = useState(!config);
  const [isActive, setIsActive] = useState(config?.isActive ?? true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveCrmIntegration({
        endpointUrl,
        secret: replacingSecret && secret ? secret : undefined,
        isActive,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSecret("");
      setReplacingSecret(false);
      setMessage("Guardado.");
      router.refresh();
    });
  };

  const testConnection = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await testCrmIntegration();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.refresh();
    });
  };

  const resyncAll = () => {
    if (!window.confirm("¿Reenviar todos los presupuestos de esta cuenta a CRM Fácil?")) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await resyncAllPresupuestos();
      setMessage(`Se reenviaron ${result.count} presupuestos.`);
      router.refresh();
    });
  };

  const chip = !config
    ? { label: "Sin configurar", bg: "var(--bg)", fg: "var(--ink-dim)" }
    : config.lastError
      ? { label: "Error", bg: "var(--danger-soft)", fg: "var(--danger)" }
      : { label: "Conectado", bg: "var(--accent-soft)", fg: "var(--accent)" };

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ fontWeight: 700 }}>CRM Fácil</div>
        <span
          style={{
            padding: "0.3rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.7rem",
            fontWeight: 700,
            background: chip.bg,
            color: chip.fg,
          }}
        >
          {chip.label}
        </span>
      </div>

      <p style={{ color: "var(--ink-dim)", fontSize: "0.82rem", margin: 0 }}>
        Copia el endpoint y genera el secreto en CRM Fácil → Admin → Integraciones → tarjeta Cotiza Fácil.
      </p>

      {config?.lastSuccessAt && (
        <p style={{ fontSize: "0.8rem", color: "var(--ink-faint)", margin: 0 }}>
          Último envío: {formatDate(config.lastSuccessAt)}
        </p>
      )}
      {config?.lastError && <p style={{ fontSize: "0.82rem", color: "var(--danger)", margin: 0 }}>{config.lastError}</p>}
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
      {message && <p style={{ color: "var(--accent)", fontSize: "0.85rem", margin: 0 }}>{message}</p>}

      <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Endpoint</span>
        <input
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
          placeholder="https://…/api/cotiza-facil/quotes"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Secreto compartido</span>
        {replacingSecret ? (
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Pega el secreto generado en CRM Fácil"
            style={inputStyle}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--ink)", fontSize: "0.9rem" }}>••••{config?.secretLast4 ?? ""}</span>
            <button
              type="button"
              onClick={() => setReplacingSecret(true)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", font: "inherit", fontSize: "0.8rem" }}
            >
              Reemplazar
            </button>
          </div>
        )}
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Activo
      </label>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: 8,
            padding: "0.6rem 1.25rem",
            font: "inherit",
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={testConnection}
          disabled={pending || !config}
          style={{
            background: "transparent",
            border: "1px solid var(--line-strong)",
            color: "var(--ink)",
            borderRadius: 8,
            padding: "0.6rem 1.1rem",
            font: "inherit",
            fontWeight: 600,
            cursor: pending || !config ? "default" : "pointer",
          }}
        >
          Probar conexión
        </button>
        <button
          type="button"
          onClick={resyncAll}
          disabled={pending || !config}
          style={{
            background: "transparent",
            border: "1px solid var(--line-strong)",
            color: "var(--ink)",
            borderRadius: 8,
            padding: "0.6rem 1.1rem",
            font: "inherit",
            fontWeight: 600,
            cursor: pending || !config ? "default" : "pointer",
          }}
        >
          Reenviar todos los presupuestos
        </button>
      </div>

      {log.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)", fontWeight: 600 }}>Historial reciente</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: 220, overflowY: "auto" }}>
            {log.map((entry) => (
              <div
                key={entry.id}
                style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.78rem", color: "var(--ink-dim)" }}
              >
                <span>{formatDate(entry.createdAt)}</span>
                <span>{LOG_LABELS[entry.status]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
