"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { requestPasswordReset } from "@/lib/password-reset/actions";

export default function RecuperarPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main className="auth-main">
        <Link href="/" className="auth-brand">
          <BrandMark height={64} />
        </Link>

        <div className="auth-heading">
          <h1>Recupera tu contraseña</h1>
          <p>Te enviamos un enlace para elegir una nueva.</p>
        </div>

        <form action={formAction} className="auth-card">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" name="email" required autoComplete="email" />
          </label>

          {state?.error && <p className="auth-error">{state.error}</p>}
          {state?.message && <p style={{ color: "var(--accent-hover)", fontSize: "0.85rem" }}>{state.message}</p>}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <p className="auth-switch">
          <Link href="/login">Volver a iniciar sesión</Link>
        </p>
      </main>
    </div>
  );
}
