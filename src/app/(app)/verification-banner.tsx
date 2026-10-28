"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/lib/verification/actions";

export function VerificationBanner({ email }: { email: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div
      style={{
        background: "#fef3c7",
        color: "#78350f",
        padding: "0.5rem 1.5rem",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        fontSize: "0.85rem",
      }}
    >
      <span>{message ?? `Confirma tu correo (${email}) con el enlace que te enviamos. Hasta entonces no se aplican planes pagados.`}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setMessage(await resendVerificationEmail()))}
        style={{
          background: "transparent",
          border: "1px solid currentColor",
          color: "inherit",
          borderRadius: 6,
          padding: "0.15rem 0.6rem",
          font: "inherit",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {pending ? "Enviando..." : "Reenviar correo"}
      </button>
    </div>
  );
}
