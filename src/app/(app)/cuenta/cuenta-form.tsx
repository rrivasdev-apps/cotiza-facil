"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAccountSettings } from "@/lib/cuenta/actions";

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  font: "inherit",
  color: "var(--ink)",
};

export function CuentaForm({ name: initialName, senderEmail: initialSenderEmail }: { name: string; senderEmail: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [senderEmail, setSenderEmail] = useState(initialSenderEmail);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateAccountSettings(name, senderEmail);
        setSaved(true);
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
        gap: "1rem",
      }}
    >
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}
      {saved && <p style={{ color: "var(--accent)", fontSize: "0.85rem" }}>Guardado.</p>}

      <label style={fieldStyle}>
        <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Nombre de la cuenta</span>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Correo remitente</span>
        <input
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="Tu Negocio <presupuestos@tudominio.com>"
          style={inputStyle}
        />
        <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
          Desde acá se envían tus presupuestos por correo. Necesita un dominio verificado en Resend — sin eso, el
          botón &quot;Enviar por correo&quot; queda deshabilitado.
        </span>
      </label>

      <button
        type="button"
        onClick={save}
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
        {pending ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}
