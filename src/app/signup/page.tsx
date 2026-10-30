"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { AcceptTerms } from "@/components/accept-terms";
import { signUp } from "./actions";

export default function SignupPage() {
  const [error, formAction, pending] = useActionState(signUp, null);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main className="auth-main">
        <Link href="/" className="auth-brand">
          <BrandMark height={64} />
        </Link>

        <div className="auth-heading">
          <h1>Crea tu cuenta</h1>
          <p>Gratis, sin tarjeta de crédito.</p>
        </div>

        <form action={formAction} className="auth-card">
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

          <AcceptTerms />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>
      </main>
    </div>
  );
}
