"use client";

import Link from "next/link";
import { useState } from "react";

const navLinkStyle: React.CSSProperties = { color: "var(--ink-dim)" };

const accountLinkStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.75rem",
  color: "var(--ink-faint)",
  textTransform: "uppercase",
};

const signOutButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ink-dim)",
  cursor: "pointer",
  font: "inherit",
};

// Encabezado con dos layouts: en desktop, marca + nav + cuenta en una
// sola fila (nada nuevo). En mobile (ver el breakpoint en globals.css)
// la nav y la cuenta se esconden y aparecen solo dentro de este panel
// desplegable, para no competir por el ancho de la pantalla.
export function AppHeader({
  accountName,
  signOutAction,
}: {
  accountName: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="app-header">
      <div className="app-header-bar">
        <span className="app-header-title">Consola de Presupuestos</span>

        <nav className="app-header-nav-desktop">
          <Link href="/presupuestos" style={navLinkStyle}>
            Presupuestos
          </Link>
          <Link href="/plantillas" style={navLinkStyle}>
            Plantillas
          </Link>
          <Link href="/catalogo" style={navLinkStyle}>
            Catálogo
          </Link>
        </nav>

        <div className="app-header-account-desktop">
          <Link href="/cuenta" style={accountLinkStyle}>
            {accountName}
          </Link>
          <form action={signOutAction}>
            <button type="submit" style={signOutButtonStyle}>
              Salir
            </button>
          </form>
        </div>

        <button
          type="button"
          className="app-header-menu-button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="app-header-mobile-panel">
          <div className="app-header-mobile-nav">
            <Link href="/presupuestos" style={navLinkStyle} onClick={close}>
              Presupuestos
            </Link>
            <Link href="/plantillas" style={navLinkStyle} onClick={close}>
              Plantillas
            </Link>
            <Link href="/catalogo" style={navLinkStyle} onClick={close}>
              Catálogo
            </Link>
          </div>

          {/* Separado de las secciones de arriba: es la cuenta activa,
              no una sección más de la app. */}
          <div className="app-header-mobile-account">
            <Link href="/cuenta" style={accountLinkStyle} onClick={close}>
              {accountName}
            </Link>
            <form action={signOutAction}>
              <button type="submit" style={signOutButtonStyle}>
                Salir
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
