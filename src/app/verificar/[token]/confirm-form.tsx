"use client";

import { useActionState } from "react";
import { confirmEmail } from "@/lib/verification/actions";

export function ConfirmForm({ token }: { token: string }) {
  const [error, formAction, pending] = useActionState(confirmEmail, null);

  return (
    <form action={formAction} className="auth-card">
      <input type="hidden" name="token" value={token} />
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? "Confirmando..." : "Confirmar mi correo"}
      </button>
    </form>
  );
}
