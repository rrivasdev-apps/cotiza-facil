// Es un enlace normal (no una server action): el navegador descarga el ZIP
// directo, sin pasar por el cliente de React.
export function ExportarDatosCard() {
  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        boxShadow: "var(--sh-soft)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Exportar mis datos</h2>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem" }}>
          Descarga una copia en un ZIP: tus clientes y presupuestos para abrir en Excel, y un archivo con el detalle
          completo (plantillas, catálogo y contenido de cada presupuesto). No incluye los PDF, que puedes volver a
          generar.
        </p>
      </div>
      <a
        href="/api/cuenta/export"
        download
        style={{
          alignSelf: "flex-start",
          background: "var(--btn-primary-bg)",
          color: "var(--btn-primary-fg)",
          borderRadius: 8,
          padding: "0.6rem 1.25rem",
          fontWeight: 600,
        }}
      >
        Descargar mis datos
      </a>
    </div>
  );
}
