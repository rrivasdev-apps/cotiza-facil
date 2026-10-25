"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";

const navLinkStyle: React.CSSProperties = { color: "var(--ink-dim)" };

const NAV_LINKS = [
  { href: "/inicio", label: "Inicio" },
  { href: "/presupuestos", label: "Presupuestos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/plantillas", label: "Plantillas" },
  { href: "/catalogo", label: "Catálogo" },
];

const COLLABORATOR_HREFS = ["/inicio", "/presupuestos", "/clientes"];

const SOPORTE_LINK ={ href: "/soporte", label: "Soporte" };

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
  isPlatformAdmin,
  canSwitchWorkspace,
  isOwner,
}: {
  accountName: string;
  signOutAction: () => Promise<void>;
  isPlatformAdmin?: boolean;
  canSwitchWorkspace?: boolean;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const pathname = usePathname();
  // El colaborador solo trabaja con presupuestos y clientes.
  const baseLinks = isOwner ? NAV_LINKS : NAV_LINKS.filter((link) => COLLABORATOR_HREFS.includes(link.href));
  const links = isPlatformAdmin ? [...baseLinks, SOPORTE_LINK] : baseLinks;

  return (
    <header className="app-header">
      <div className="app-header-bar">
        <span className="app-header-brand">
          <BrandMark />
        </span>

        <nav className="app-header-nav-desktop">
          {links.map((link) => (
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
          {isOwner ? (
            <Link href="/cuenta" style={accountLinkStyle}>
              {accountName}
            </Link>
          ) : (
            <span style={accountLinkStyle}>{accountName}</span>
          )}
          {canSwitchWorkspace && (
            <Link href="/elegir-workspace" style={navLinkStyle}>
              Cambiar
            </Link>
          )}
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
            {links.map((link) => (
              <Link key={link.href} href={link.href} style={navLinkStyle} onClick={close}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Separado de las secciones de arriba: es la cuenta activa,
              no una sección más de la app. */}
          <div className="app-header-mobile-account">
            {isOwner ? (
              <Link href="/cuenta" style={accountLinkStyle} onClick={close}>
                {accountName}
              </Link>
            ) : (
              <span style={accountLinkStyle}>{accountName}</span>
            )}
            {canSwitchWorkspace && (
              <Link href="/elegir-workspace" style={navLinkStyle} onClick={close}>
                Cambiar
              </Link>
            )}
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
