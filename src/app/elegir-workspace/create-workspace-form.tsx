"use client";

import { useActionState } from "react";
import { createOwnWorkspace } from "@/lib/workspaces/actions";

export function CreateWorkspaceForm() {
  const [error, formAction, pending] = useActionState(createOwnWorkspace, null);

  return (
    <form action={formAction} className="auth-card">
      <label className="auth-field">
        <span>O crea tu propio workspace</span>
        <input type="text" name="account_name" required placeholder="Nombre de tu negocio" />
      </label>

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? "Creando..." : "Crear workspace"}
      </button>
    </form>
  );
}
