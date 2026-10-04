"use client";

import { useState } from "react";
import type { Cliente } from "@/lib/types";
import { cardStyle, fieldStyle, inputStyle, labelStyle } from "./new/new-presupuesto-form";

const linkButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--accent)",
  cursor: "pointer",
  font: "inherit",
  fontSize: "0.8rem",
  fontWeight: 600,
  padding: 0,
};

// Elige un cliente ya guardado (su nombre/correo viajan como inputs
// ocultos, porque el <select> solo puede mandar el id) o arma uno
// nuevo ahí mismo — en ambos casos siempre viajan client_name/
// client_email (el server action los exige igual que antes); solo en
// "nuevo" viajan también client_phone/client_address, que
// createPresupuesto/updatePresupuesto usan para crear la fila en
// clientes cuando client_id llega vacío.
export function ClientPicker({
  clientes,
  initialClientId,
  initialName = "",
  initialEmail = "",
  initialPhone = "",
  initialAddress = "",
}: {
  clientes: Cliente[];
  initialClientId?: string | null;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialAddress?: string;
}) {
  const matchedClient = initialClientId ? (clientes.find((c) => c.id === initialClientId) ?? null) : null;
  // Si ya hay un cliente vinculado, arranca mostrándolo. Si no, pero
  // hay nombre/correo (editando un presupuesto viejo sin cliente
  // vinculado), arranca en "nuevo" con esos datos precargados — así
  // no se pierden. Si no hay nada de lo anterior, arranca en
  // "existente" cuando hay clientes para elegir (fomenta reusar).
  const defaultMode: "existing" | "new" = matchedClient
    ? "existing"
    : initialName
      ? "new"
      : clientes.length > 0
        ? "existing"
        : "new";

  const [mode, setMode] = useState<"existing" | "new">(defaultMode);
  const [selectedId, setSelectedId] = useState(matchedClient?.id ?? "");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);

  const selectExisting = (id: string) => {
    setSelectedId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) {
      setName(c.name);
      setEmail(c.email);
      setPhone(c.phone ?? "");
      setAddress(c.address ?? "");
    }
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem" }}>Cliente</span>
        {mode === "existing" ? (
          <button type="button" onClick={() => { setMode("new"); setSelectedId(""); }} style={linkButtonStyle}>
            + Nuevo cliente
          </button>
        ) : (
          clientes.length > 0 && (
            <button type="button" onClick={() => setMode("existing")} style={linkButtonStyle}>
              ← Elegir cliente existente
            </button>
          )
        )}
      </div>

      {mode === "existing" ? (
        <>
          <label style={fieldStyle}>
            <span style={labelStyle()}>Cliente</span>
            <select
              value={selectedId}
              onChange={(e) => selectExisting(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="" disabled>
                Elige un cliente
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
            </select>
          </label>
          {selectedId && (phone || address) && (
            <div style={{ fontSize: "0.8rem", color: "var(--ink-dim)", lineHeight: 1.6 }}>
              {phone && <div>Tel: {phone}</div>}
              {address && <div>{address}</div>}
            </div>
          )}
          <input type="hidden" name="client_id" value={selectedId} />
          <input type="hidden" name="client_name" value={name} />
          <input type="hidden" name="client_email" value={email} />
          <input type="hidden" name="client_phone" value={phone} />
          <input type="hidden" name="client_address" value={address} />
        </>
      ) : (
        <>
          <input type="hidden" name="client_id" value="" />
          <label style={fieldStyle}>
            <span style={labelStyle()}>Nombre del cliente</span>
            <input
              type="text"
              name="client_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle()}>Correo del cliente</span>
            <input
              type="email"
              name="client_email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle()}>Teléfono (opcional)</span>
            <input
              type="text"
              name="client_phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle()}>Dirección (opcional)</span>
            <input
              type="text"
              name="client_address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyle}
            />
          </label>
        </>
      )}
    </div>
  );
}
