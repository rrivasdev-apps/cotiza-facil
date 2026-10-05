"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disableSupportAccess, enableSupportAccess } from "@/lib/support/actions";

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" });
}

export function SupportAccessToggle({ supportAccessUntil }: { supportAccessUntil: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const active = supportAccessUntil !== null && new Date(supportAccessUntil) > new Date();

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        boxShadow: "var(--sh-soft)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Acceso de soporte</div>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.82rem", margin: 0 }}>
          Mientras esté activo, el equipo de Cotiza Fácil puede entrar a tu cuenta para ayudarte con un problema —
          útil mientras estás aprendiendo a usarla o si algo no te funciona. Se apaga solo después de 48 horas.
        </p>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      {active ? (
        <>
          <p style={{ fontSize: "0.82rem", color: "var(--accent)", margin: 0 }}>
            Activo hasta {formatExpiry(supportAccessUntil!)}.
          </p>
          <button
            type="button"
            onClick={() => run(disableSupportAccess)}
            disabled={pending}
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: "1px solid var(--line-strong)",
              color: "var(--ink)",
              borderRadius: 8,
              padding: "0.5rem 1.1rem",
              font: "inherit",
              fontWeight: 600,
              cursor: pending ? "default" : "pointer",
            }}
          >
            {pending ? "Desactivando..." : "Desactivar ahora"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => run(enableSupportAccess)}
          disabled={pending}
          style={{
            alignSelf: "flex-start",
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
          {pending ? "Activando..." : "Permitir acceso de soporte"}
        </button>
      )}
    </div>
  );
}
