"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <form
        action={formAction}
        style={{
          background: "var(--card)",
          borderRadius: 12,
          boxShadow: "var(--sh-soft)",
          padding: "2rem",
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Consola de Presupuestos</h1>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            style={{
              background: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "0.6rem 0.75rem",
              font: "inherit",
              color: "var(--ink)",
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Contraseña</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            style={{
              background: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "0.6rem 0.75rem",
              font: "inherit",
              color: "var(--ink)",
            }}
          />
        </label>

        {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}

        <button
          type="submit"
          disabled={pending}
          style={{
            background: "var(--ink)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.65rem",
            font: "inherit",
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
