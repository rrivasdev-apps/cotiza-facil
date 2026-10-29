import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-main">
      <div className="auth-heading">
        <h1>Página no encontrada</h1>
        <p>La dirección no existe o el contenido ya no está disponible.</p>
      </div>
      <div className="auth-card">
        <Link href="/" className="auth-submit" style={{ textAlign: "center" }}>
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
