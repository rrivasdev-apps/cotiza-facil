"use client";

import { useEffect } from "react";
import { ErrorPanel } from "@/components/error-panel";

// Dentro de la app: error.tsx envuelve la página pero no el layout, así que
// el encabezado y la navegación siguen visibles.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "2rem 0" }}>
      <ErrorPanel digest={error.digest} retry={retry} />
    </div>
  );
}
