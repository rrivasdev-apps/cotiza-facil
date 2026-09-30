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
          <Link href="/login" className="public-header-link">
            Iniciar sesión
          </Link>
          <Link href="/signup" className="public-header-cta">
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}
