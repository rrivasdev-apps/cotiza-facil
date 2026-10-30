"use client";

import { useActionState } from "react";
import { AcceptTerms } from "@/components/accept-terms";
import { acceptInvitation, acceptInvitationWithSignup } from "@/lib/colaboradores/actions";

export function AcceptForm({ token }: { token: string }) {
  const [error, formAction, pending] = useActionState(acceptInvitation, null);

  return (
    <form action={formAction} className="auth-card">
      <input type="hidden" name="token" value={token} />
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? "Uniéndote..." : "Aceptar invitación"}
      </button>
    </form>
  );
}

export function SignupForm({ token, email }: { token: string; email: string }) {
  const [error, formAction, pending] = useActionState(acceptInvitationWithSignup, null);

  return (
    <form action={formAction} className="auth-card">
      <input type="hidden" name="token" value={token} />

      <label className="auth-field">
        <span>Email</span>
        <input type="email" value={email} readOnly />
      </label>

      <label className="auth-field">
        <span>Crea una contraseña</span>
        <input type="password" name="password" required autoComplete="new-password" minLength={8} />
      </label>

      <label className="auth-field">
        <span>Confirmar contraseña</span>
        <input type="password" name="password_confirm" required autoComplete="new-password" minLength={8} />
      </label>

      <AcceptTerms />

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? "Creando usuario..." : "Crear usuario y unirme"}
      </button>
    </form>
  );
}
