"use client";

import Link from "next/link";

// Contenido compartido de las pantallas de error (error.tsx raíz y el de
// (app)). El digest es el id que Next usa para cruzar este error con el
// log del servidor: se muestra para que quien lo reporte lo pueda citar.
export function ErrorPanel({ digest, retry }: { digest?: string; retry: () => void }) {
  return (
    <>
      <div className="auth-heading">
        <h1>Algo salió mal</h1>
        <p>Ocurrió un error inesperado. Puedes intentarlo de nuevo o volver al inicio.</p>
      </div>

      <div className="auth-card">
        <button type="button" className="auth-submit" onClick={() => retry()}>
          Intentar de nuevo
        </button>
        <Link href="/" className="auth-submit" style={{ textAlign: "center" }}>
          Ir al inicio
        </Link>
        {digest && (
          <p style={{ color: "var(--ink-dim)", fontSize: "0.75rem", textAlign: "center" }}>
            Código de referencia: {digest}
          </p>
        )}
      </div>
    </>
  );
}
