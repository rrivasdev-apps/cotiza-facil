"use client";

import { useState, useTransition } from "react";
import { enterAsAccount, type SupportEligibleAccount } from "@/lib/support/actions";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--sh-soft)",
  padding: "1.1rem 1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" });
}

export function SoporteList({ accounts }: { accounts: SupportEligibleAccount[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const handleEnter = (accountId: string) => {
    setError(null);
    setLink(null);
    setActiveAccountId(accountId);
    startTransition(async () => {
      try {
        const { url } = await enterAsAccount(accountId);
        setLink(`${window.location.origin}${url}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  if (accounts.length === 0) {
    return <p style={{ color: "var(--ink-dim)" }}>Ninguna cuenta tiene el acceso de soporte activo ahora mismo.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      {accounts.map((acc) => (
        <div key={acc.accountId} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{acc.accountName}</div>
              <div style={{ color: "var(--ink-dim)", fontSize: "0.8rem" }}>{acc.userEmail}</div>
              <div style={{ color: "var(--ink-faint)", fontSize: "0.75rem" }}>
                Acceso vence: {formatExpiry(acc.supportAccessUntil)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleEnter(acc.accountId)}
              disabled={pending && activeAccountId === acc.accountId}
              style={{
                background: "var(--btn-primary-bg)",
                color: "var(--btn-primary-fg)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 1rem",
                font: "inherit",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: pending ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {pending && activeAccountId === acc.accountId ? "Generando..." : "Entrar como"}
            </button>
          </div>

          {activeAccountId === acc.accountId && link && (
            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <p style={{ fontSize: "0.8rem", color: "var(--ink-dim)", margin: 0 }}>
                Ábrelo en una ventana de <strong>incógnito</strong> — así tu propia sesión no se toca. Es de un solo
                uso: si lo necesitas de nuevo más tarde, genera otro con &quot;Entrar como&quot;.
              </p>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem", wordBreak: "break-all" }}
              >
                {link}
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
