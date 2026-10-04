"use client";

import { useState, useTransition } from "react";
import { createCliente, deleteCliente, updateCliente } from "@/lib/clientes/actions";
import type { Cliente } from "@/lib/types";

const inputStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.6rem 0.85rem",
  font: "inherit",
  fontSize: "0.875rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

export function ClientesList({ clientes }: { clientes: Cliente[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !email.trim()) return;
          run(() => createCliente(name.trim(), email.trim(), phone.trim(), address.trim()));
          setName("");
          setEmail("");
          setPhone("");
          setAddress("");
        }}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "0.85rem",
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--sh-soft)",
          padding: "1.1rem 1.35rem",
        }}
      >
        <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="cliente-name">
            Nombre
          </label>
          <input
            id="cliente-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Jardines Verde S.A."
            required
            style={inputStyle}
          />
        </div>
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="cliente-email">
            Correo
          </label>
          <input
            id="cliente-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@ejemplo.com"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ flex: "1 1 150px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="cliente-phone">
            Teléfono (opcional)
          </label>
          <input
            id="cliente-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0414-1234567"
            style={inputStyle}
          />
        </div>
        <div style={{ flexBasis: "100%", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={labelStyle} htmlFor="cliente-address">
            Dirección (opcional)
          </label>
          <input
            id="cliente-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección del cliente"
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "0.6rem 1.15rem",
            font: "inherit",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Agregar
        </button>
      </form>

      {clientes.length === 0 ? (
        <p style={{ color: "var(--ink-dim)" }}>Todavía no tienes clientes guardados.</p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            background: "var(--card)",
            boxShadow: "var(--sh-soft)",
            overflow: "hidden",
          }}
        >
          {clientes.map((cliente, i) => (
            <ClienteRow key={cliente.id} cliente={cliente} run={run} isLast={i === clientes.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClienteRow({
  cliente,
  run,
  isLast,
}: {
  cliente: Cliente;
  run: (fn: () => Promise<unknown>) => void;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cliente.name);
  const [email, setEmail] = useState(cliente.email);
  const [phone, setPhone] = useState(cliente.phone ?? "");
  const [address, setAddress] = useState(cliente.address ?? "");
  const borderBottom = isLast ? "none" : "1px solid var(--line)";

  const save = () => {
    if (!name.trim() || !email.trim()) return;
    run(() => updateCliente(cliente.id, name.trim(), email.trim(), phone.trim(), address.trim()));
    setEditing(false);
  };

  const cancel = () => {
    setName(cliente.name);
    setEmail(cliente.email);
    setPhone(cliente.phone ?? "");
    setAddress(cliente.address ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", padding: "0.9rem 1.25rem", borderBottom }}>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, flex: "1 1 160px" }} placeholder="Nombre" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, flex: "1 1 180px" }} placeholder="Correo" type="email" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, flex: "1 1 140px" }} placeholder="Teléfono" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} style={{ ...inputStyle, flexBasis: "100%" }} placeholder="Dirección" />
        <button
          type="button"
          onClick={save}
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "0.5rem 1rem",
            font: "inherit",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={cancel}
          style={{ background: "transparent", border: "none", color: "var(--ink-dim)", cursor: "pointer", font: "inherit" }}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1.25rem", borderBottom, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{cliente.name}</div>
        <div style={{ color: "var(--ink-dim)", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cliente.email}
        </div>
      </div>
      {cliente.phone && (
        <span style={{ color: "var(--ink-dim)", fontSize: "0.8rem", flex: "0 0 auto" }}>{cliente.phone}</span>
      )}
      <div style={{ display: "flex", gap: "0.35rem", flex: "0 0 auto", marginLeft: "auto" }}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar"
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => run(() => deleteCliente(cliente.id))}
          aria-label="Eliminar"
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
