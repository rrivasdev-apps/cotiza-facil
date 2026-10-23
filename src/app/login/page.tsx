"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { signIn } from "./actions";

const SUPPORT_LINK_MESSAGES: Record<string, string> = {
  incompleto: "El link de soporte está incompleto — cópialo completo y vuelve a intentar.",
  invalido: "El link de soporte ya se usó o venció. Genera uno nuevo desde Soporte y ábrelo de inmediato, sin hacer clic antes en otra ventana.",
};

function SupportLinkNotice() {
  const message = SUPPORT_LINK_MESSAGES[useSearchParams().get("soporte") ?? ""];
  return message ? <p className="auth-error">{message}</p> : null;
}

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main className="auth-main">
        <Link href="/" className="auth-brand">
          <BrandMark height={64} />
        </Link>

        <div className="auth-heading">
          <h1>Bienvenido de vuelta</h1>
          <p>Inicia sesión en Cotiza Fácil</p>
        </div>

        <form action={formAction} className="auth-card">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" name="email" required autoComplete="email" />
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <input type="password" name="password" required autoComplete="current-password" />
          </label>

          <Suspense>
            <SupportLinkNotice />
          </Suspense>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={pending} className="auth-submit">
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tienes cuenta? <Link href="/signup">Crea una gratis</Link>
        </p>
      </main>
    </div>
  );
}
