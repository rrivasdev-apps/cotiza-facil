// Laptop + teléfono del hero: maqueta en HTML/CSS (no captura real) para
// no depender de un screenshot que haya que mantener al día. Los datos
// son de ejemplo y aria-hidden la oculta a lectores de pantalla.
const RECENT = [
  { name: "Manuel Sánchez", amount: "$200,00", status: "Borrador" },
  { name: "Manuel Sánchez", amount: "$250,00", status: "Enviado" },
  { name: "Manuel Sánchez", amount: "$325,00", status: "Aprobado" },
];

const STATS = [
  { label: "Presupuestos creados", value: "7" },
  { label: "Aprobados", value: "3" },
  { label: "Pendientes de respuesta", value: "3" },
  { label: "Rechazados", value: "0" },
];

function MockDashboard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "hm-screen hm-screen-compact" : "hm-screen"}>
      <div className="hm-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal.png" alt="" height={14} className="hm-logo" />
        {!compact && (
          <div className="hm-tabs">
            <b>Inicio</b>
            <span>Presupuestos</span>
            <span>Clientes</span>
            <span>Plantillas</span>
          </div>
        )}
      </div>
      <p className="hm-hello">Rafael Rivas</p>
      <div className="hm-body">
        <div className="hm-main">
          <div className="hm-hero-card">
            <small>Monto aprobado · este mes</small>
            <strong>$ 405,00</strong>
            <em>+ Nuevo presupuesto</em>
          </div>
          <div className="hm-stats">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <small>{stat.label}</small>
                <b>{stat.value}</b>
              </div>
            ))}
          </div>
        </div>
        {!compact && (
          <div className="hm-list">
            <small>Últimos presupuestos</small>
            {RECENT.map((row, index) => (
              <div key={index} className="hm-row">
                <span>{row.name}</span>
                <b>{row.amount}</b>
                <i data-status={row.status}>{row.status}</i>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HeroMock() {
  return (
    <div className="hm" aria-hidden="true">
      <div className="hm-chip hm-chip-pdf">
        <span className="hm-chip-pdf-icon">PDF</span> PDF listo para enviar
      </div>
      <div className="hm-laptop">
        <div className="hm-laptop-lid">
          <MockDashboard />
        </div>
        <div className="hm-laptop-base" />
      </div>
      <div className="hm-phone">
        <MockDashboard compact />
      </div>
      <div className="hm-chip hm-chip-ok">
        <span className="hm-chip-ok-icon">✓</span> Presupuesto aprobado
      </div>
    </div>
  );
}
