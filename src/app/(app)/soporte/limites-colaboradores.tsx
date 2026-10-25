"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMaxCollaborators, type CollaboratorLimitRow } from "@/lib/support/actions";

const inputStyle: React.CSSProperties = {
  width: 70,
  background: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "0.4rem 0.6rem",
  font: "inherit",
  color: "var(--ink)",
};

function LimitRow({ row }: { row: CollaboratorLimitRow }) {
  const router = useRouter();
  const [value, setValue] = useState(String(row.maxCollaborators));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const changed = value !== String(row.maxCollaborators);

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setMaxCollaborators(row.accountId, Number(value));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{row.accountName}</div>
        <div style={{ color: "var(--ink-dim)", fontSize: "0.8rem" }}>
          {row.ownerEmail} · {row.collaborators} colaborador{row.collaborators === 1 ? "" : "es"}
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="number"
          min={0}
          max={1000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`Límite de colaboradores de ${row.accountName}`}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || !changed}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: 8,
            padding: "0.4rem 0.9rem",
            font: "inherit",
            fontWeight: 600,
            opacity: changed ? 1 : 0.5,
            cursor: pending || !changed ? "default" : "pointer",
          }}
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export function LimitesColaboradores({ rows }: { rows: CollaboratorLimitRow[] }) {
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
      <div style={{ fontWeight: 700 }}>Límite de colaboradores por cuenta</div>
      {rows.map((row) => (
        <LimitRow key={row.accountId} row={row} />
      ))}
    </div>
  );
}
