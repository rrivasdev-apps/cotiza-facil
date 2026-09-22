"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinkStyle: React.CSSProperties = { color: "var(--ink-dim)" };

const NAV_LINKS = [
  { href: "/presupuestos", label: "Presupuestos" },
  { href: "/plantillas", label: "Plantillas" },
  { href: "/catalogo", label: "Catálogo" },
];

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
  const pathname = usePathname();

  return (
    <header className="app-header">
      <div className="app-header-bar">
        <span className="app-header-brand">
          <span className="app-header-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M13 2v6h6" />
              <path d="M9 13h6" />
              <path d="M9 17h6" />
            </svg>
          </span>
          <span className="app-header-title">Consola de Presupuestos</span>
        </span>

        <nav className="app-header-nav-desktop">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname?.startsWith(link.href) ? "active" : undefined}
            >
              {link.label}
            </Link>
          ))}
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
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} style={navLinkStyle} onClick={close}>
                {link.label}
              </Link>
            ))}
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
