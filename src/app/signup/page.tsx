"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PublicHeader } from "@/components/public-header";
import { signUp } from "./actions";

export default function SignupPage() {
  const [error, formAction, pending] = useActionState(signUp, null);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main className="auth-main">
        <form action={formAction} className="auth-card">
          <h1>Crea tu cuenta</h1>
          <p className="auth-card-sub">Gratis, sin tarjeta de crédito.</p>

          <label className="auth-field">
            <span>Nombre de tu negocio</span>
            <input type="text" name="account_name" required autoComplete="organization" />
          </label>

          <label className="auth-field">
            <span>Email</span>
            <input type="email" name="email" required autoComplete="email" />
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <input type="password" name="password" required autoComplete="new-password" minLength={8} />
          </label>

          <label className="auth-field">
            <span>Confirmar contraseña</span>
            <input type="password" name="password_confirm" required autoComplete="new-password" minLength={8} />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <p className="auth-switch">
            ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
