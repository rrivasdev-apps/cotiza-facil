"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PublicHeader } from "@/components/public-header";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main className="auth-main">
        <form action={formAction} className="auth-card">
          <h1>Iniciar sesión</h1>

          <label className="auth-field">
            <span>Email</span>
            <input type="email" name="email" required autoComplete="email" />
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <input type="password" name="password" required autoComplete="current-password" />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="auth-switch">
            ¿No tienes cuenta? <Link href="/signup">Crea una gratis</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
