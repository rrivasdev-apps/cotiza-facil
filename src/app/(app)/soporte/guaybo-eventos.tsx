"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reprocessGuayboEvent, type GuayboEventRow } from "@/lib/support/actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" });
}

function EventRow({ row }: { row: GuayboEventRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Activados y duplicados no necesitan reproceso.
  const done = row.outcome?.startsWith("activado") || row.outcome?.startsWith("duplicado");

  const reprocess = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        setMessage(await reprocessGuayboEvent(row.id));
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.85rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>
          {row.eventType ?? "?"} · {row.plan ?? "sin plan"}
        </span>
        <span style={{ color: "var(--ink-faint)" }}>{formatDate(row.receivedAt)}</span>
      </div>
      <div style={{ color: "var(--ink-dim)" }}>
        {row.email ?? "sin email"} · pago: {row.paymentStatus ?? "sin pago"}
      </div>
      <div style={{ color: done ? "var(--accent)" : "var(--ink-dim)" }}>{message ?? row.outcome ?? "sin procesar"}</div>
      {!done && (
        <button
          type="button"
          onClick={reprocess}
          disabled={pending}
          style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--accent)", cursor: "pointer", font: "inherit", fontSize: "0.8rem", padding: 0 }}
        >
          {pending ? "Reprocesando..." : "Reprocesar"}
        </button>
      )}
    </div>
  );
}

export function GuayboEventos({ rows }: { rows: GuayboEventRow[] }) {
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
      <div style={{ fontWeight: 700 }}>Avisos de Guaybo</div>
      {rows.length === 0 && <p style={{ margin: 0, color: "var(--ink-faint)", fontSize: "0.85rem" }}>Todavía no ha llegado ningún aviso.</p>}
      {rows.map((row) => (
        <EventRow key={row.id} row={row} />
      ))}
    </div>
  );
}
