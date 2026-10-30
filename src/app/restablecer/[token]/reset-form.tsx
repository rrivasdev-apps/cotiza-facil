"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/password-reset/actions";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, null);

  return (
    <form action={formAction} className="auth-card">
      <input type="hidden" name="token" value={token} />

      <label className="auth-field">
        <span>Contraseña nueva</span>
        <input type="password" name="password" required autoComplete="new-password" minLength={8} />
      </label>

      <label className="auth-field">
        <span>Confirmar contraseña</span>
        <input type="password" name="password_confirm" required autoComplete="new-password" minLength={8} />
      </label>

      {state?.error && <p className="auth-error">{state.error}</p>}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
