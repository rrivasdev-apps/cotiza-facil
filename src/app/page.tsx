export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "3rem",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
        Consola de Presupuestos
      </h1>
      <p style={{ color: "var(--ink-dim)" }}>
        Setup en curso — paso 1: tablas y RLS en Supabase.
      </p>
    </main>
  );
}
