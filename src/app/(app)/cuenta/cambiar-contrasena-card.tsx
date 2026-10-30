"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/password-reset/actions";

export function CambiarContrasenaCard() {
  const [state, formAction, pending] = useActionState(changePassword, null);

  return (
    <form
      action={formAction}
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
      <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Cambiar contraseña</h2>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
        <span>Contraseña actual</span>
        <input type="password" name="current_password" required autoComplete="current-password" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
        <span>Contraseña nueva</span>
        <input type="password" name="password" required autoComplete="new-password" minLength={8} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
        <span>Confirmar contraseña nueva</span>
        <input type="password" name="password_confirm" required autoComplete="new-password" minLength={8} />
      </label>

      {state?.error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{state.error}</p>}
      {state?.message && <p style={{ color: "var(--accent-hover)", fontSize: "0.85rem" }}>{state.message}</p>}

      <button
        type="submit"
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
        {pending ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
