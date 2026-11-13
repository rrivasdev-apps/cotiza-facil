import Link from "next/link";
import { BrandMark } from "./brand-mark";

// Header compartido por landing, login y signup — a diferencia de
// AppHeader (app-header.tsx), no depende de sesión ni tiene nav de
// producto, solo marca + los dos links de auth.
export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header-bar">
        <Link href="/" className="public-header-brand">
          <BrandMark />
        </Link>
        <nav className="public-header-actions">
          <Link href="/#como-funciona" className="public-header-link">
            Cómo funciona
          </Link>
          <Link href="/#precios" className="public-header-link">
            Precios
          </Link>
          <Link href="/login" className="public-header-link">
            <span className="ph-long">Iniciar sesión</span>
            <span className="ph-short">Entrar</span>
          </Link>
          <Link href="/signup" className="public-header-cta">
            <span className="ph-long">Crear cuenta gratis</span>
            <span className="ph-short">Crear cuenta</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
