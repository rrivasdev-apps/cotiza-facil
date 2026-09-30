"use client";

import { useState, useTransition } from "react";
import { acceptTemplateShare, rejectTemplateShare, sendTemplateShare } from "@/lib/templates/share-actions";
import type { TemplateShare } from "@/lib/types";

const STATUS_LABELS: Record<TemplateShare["status"], string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

const STATUS_COLORS: Record<TemplateShare["status"], string> = {
  pendiente: "var(--ink-dim)",
  aceptada: "var(--accent)",
  rechazada: "#c0392b",
};

export function ShareTemplateButton({ templateId }: { templateId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "1px solid var(--ink-dim)",
          color: "var(--ink-dim)",
          borderRadius: 8,
          padding: "0.4rem 0.75rem",
          fontSize: "0.8rem",
          cursor: "pointer",
        }}
      >
        Compartir
      </button>
    );
  }

  const send = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await sendTemplateShare(templateId, trimmed);
        setEmail("");
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo enviar.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
      <div style={{ display: "flex", gap: "0.3rem" }}>
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{
            fontSize: "0.8rem",
            padding: "0.35rem 0.5rem",
            borderRadius: 6,
            border: "1px solid var(--line)",
            width: 170,
          }}
        />
        <button
          type="button"
          disabled={pending || !email.trim()}
          onClick={send}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: 8,
            padding: "0.4rem 0.75rem",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Enviando..." : "Enviar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          style={{ background: "transparent", border: "none", color: "var(--ink-dim)", cursor: "pointer", fontSize: "0.8rem" }}
        >
          Cancelar
        </button>
      </div>
      {error && <span style={{ color: "#c0392b", fontSize: "0.7rem", maxWidth: 220, textAlign: "right" }}>{error}</span>}
    </div>
  );
}

function RejectShareButton({ shareId }: { shareId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await rejectTemplateShare(shareId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo rechazar.");
            }
          });
        }}
        style={{
          background: "transparent",
          border: "1px solid #c0392b",
          color: "#c0392b",
          borderRadius: 8,
          padding: "0.4rem 0.75rem",
          fontSize: "0.8rem",
          cursor: pending ? "default" : "pointer",
        }}
      >
        {pending ? "Rechazando..." : "Rechazar"}
      </button>
      {error && <span style={{ color: "#c0392b", fontSize: "0.7rem" }}>{error}</span>}
    </div>
  );
}

export function IncomingShares({ shares }: { shares: TemplateShare[] }) {
  if (shares.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        background: "var(--accent-soft)",
        border: "1px solid var(--accent)",
        borderRadius: 12,
        padding: "1rem 1.25rem",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Plantillas compartidas contigo</span>
      {shares.map((share) => (
        <div
          key={share.id}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{share.source_template_name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink-dim)" }}>De: {share.sender_account_name}</div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <form action={acceptTemplateShare.bind(null, share.id)}>
              <button
                type="submit"
                style={{
                  background: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-fg)",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Aceptar
              </button>
            </form>
            <RejectShareButton shareId={share.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SentShares({ shares }: { shares: TemplateShare[] }) {
  if (shares.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink-dim)" }}>Plantillas que enviaste</span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "var(--card)",
          borderRadius: 12,
          boxShadow: "var(--sh-soft)",
          overflow: "hidden",
        }}
      >
        {shares.map((share, i) => (
          <div
            key={share.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              padding: "0.75rem 1.1rem",
              borderBottom: i === shares.length - 1 ? "none" : "1px solid var(--line)",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <span style={{ fontWeight: 600 }}>{share.source_template_name}</span>
              <span style={{ color: "var(--ink-faint)" }}> → {share.recipient_email}</span>
            </div>
            <span style={{ color: STATUS_COLORS[share.status], fontWeight: 700, fontSize: "0.75rem" }}>
              {STATUS_LABELS[share.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
