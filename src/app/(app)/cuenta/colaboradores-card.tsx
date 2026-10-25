"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteCollaborator,
  removeCollaborator,
  revokeInvitation,
  type CollaboratorsOverview,
} from "@/lib/colaboradores/actions";

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 180,
  background: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  font: "inherit",
  color: "var(--ink)",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--accent)",
  cursor: "pointer",
  font: "inherit",
  fontSize: "0.8rem",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  fontSize: "0.9rem",
};

export function ColaboradoresCard({ overview }: { overview: CollaboratorsOverview }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const used = overview.collaborators.length + overview.invitations.length;
  const full = used >= overview.max;

  const invite = () => {
    setError(null);
    setNotice(null);
    setInviteUrl(null);
    startTransition(async () => {
      const result = await inviteCollaborator(email);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEmail("");
      setInviteUrl(result.inviteUrl);
      setNotice(
        result.emailSent
          ? "Invitación enviada por correo."
          : `No se pudo enviar el correo (${result.emailError ?? "error desconocido"}). Comparte este enlace directamente:`,
      );
      router.refresh();
    });
  };

  const run = (action: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setInviteUrl(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
      }
    });
  };

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        boxShadow: "var(--sh-soft)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ fontWeight: 700 }}>Colaboradores</div>
        <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>
          {used} de {overview.max}
        </span>
      </div>

      <p style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>
        Un colaborador puede crear y enviar presupuestos y gestionar clientes. No ve plantillas, catálogo ni la
        configuración de la cuenta.
      </p>

      {overview.collaborators.map((collaborator) => (
        <div key={collaborator.userId} style={rowStyle}>
          <span>{collaborator.email}</span>
          <button
            type="button"
            disabled={pending}
            style={linkButtonStyle}
            onClick={() => {
              if (window.confirm(`¿Quitar a ${collaborator.email} del workspace?`)) {
                run(() => removeCollaborator(collaborator.userId));
              }
            }}
          >
            Quitar
          </button>
        </div>
      ))}

      {overview.invitations.map((invitation) => (
        <div key={invitation.id} style={rowStyle}>
          <span>
            {invitation.email}{" "}
            <span style={{ color: "var(--ink-faint)", fontSize: "0.75rem" }}>
              · pendiente, vence {new Date(invitation.expiresAt).toLocaleDateString("es-VE")}
            </span>
          </span>
          <button type="button" disabled={pending} style={linkButtonStyle} onClick={() => run(() => revokeInvitation(invitation.id))}>
            Revocar
          </button>
        </div>
      ))}

      {used === 0 && <p style={{ fontSize: "0.85rem", color: "var(--ink-faint)" }}>Todavía no has invitado a nadie.</p>}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          disabled={full}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={invite}
          disabled={pending || full || !email.trim()}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: 8,
            padding: "0.6rem 1.25rem",
            font: "inherit",
            fontWeight: 600,
            cursor: pending || full ? "default" : "pointer",
          }}
        >
          {pending ? "Enviando..." : "Invitar"}
        </button>
      </div>

      {full && (
        <p style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>
          Llegaste al límite de colaboradores de tu plan. Contáctanos para ampliarlo.
        </p>
      )}
      {notice && <p style={{ fontSize: "0.85rem", color: "var(--accent)" }}>{notice}</p>}
      {inviteUrl && (
        <input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} style={{ ...inputStyle, flex: "none" }} />
      )}
      {error && <p style={{ fontSize: "0.85rem", color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
