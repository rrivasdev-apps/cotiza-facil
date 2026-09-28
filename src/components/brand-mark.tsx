// Mismo ícono/tratamiento que .app-header-mark (ver app-header.tsx) —
// separado en su propio componente para reusarlo en las superficies
// públicas (landing, login, signup) sin duplicar el SVG a mano.
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: Math.round(size * 0.3),
        background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
      }}
    >
      <svg
        width={Math.round(size * 0.53)}
        height={Math.round(size * 0.53)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M13 2v6h6" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    </span>
  );
}
