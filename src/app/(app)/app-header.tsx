"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";

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
          <BrandMark />
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
