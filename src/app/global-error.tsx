"use client";

import { useEffect } from "react";

// Reemplaza al layout raíz cuando este mismo falla, así que no hay
// globals.css ni fuentes: estilos propios, y el tema sigue el del sistema.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <style>{`
          body { margin: 0; font-family: system-ui, sans-serif; background: #f5f5f5; color: #1f2933; }
          @media (prefers-color-scheme: dark) { body { background: #16181a; color: #e8eaed; } }
          main { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 1.5rem; text-align: center; }
          button { background: #16a34a; color: #fff; border: none; border-radius: 8px; padding: 0.75rem 1.25rem; font: inherit; font-weight: 700; cursor: pointer; }
          small { opacity: 0.7; }
        `}</style>
        <main>
          <h1>Algo salió mal</h1>
          <p>Ocurrió un error inesperado. Intenta de nuevo; si sigue fallando, vuelve en unos minutos.</p>
          <button type="button" onClick={() => retry()}>
            Intentar de nuevo
          </button>
          {error.digest && <small>Código de referencia: {error.digest}</small>}
        </main>
      </body>
    </html>
  );
}
