import Image from "next/image";

// Laptop (captura real) + teléfono (maqueta en HTML/CSS con datos de
// ejemplo hasta tener captura móvil). aria-hidden: es decorativo.
const STATS = [
  { label: "Presupuestos creados", value: "7" },
  { label: "Aprobados", value: "3" },
  { label: "Pendientes de respuesta", value: "3" },
  { label: "Rechazados", value: "0" },
];

function PhoneDashboard() {
  return (
    <div className="hm-screen hm-screen-compact">
      <div className="hm-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal.png" alt="" height={14} className="hm-logo" />
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
          {/* Captura real del inicio de la app; hay que actualizarla si cambia esa pantalla. */}
          <Image
            src="/landing/app-inicio-desktop.png"
            alt=""
            width={1031}
            height={786}
            priority
            className="hm-laptop-shot"
          />
        </div>
        <div className="hm-laptop-base" />
      </div>
      <div className="hm-phone">
        <PhoneDashboard />
      </div>
      <div className="hm-chip hm-chip-ok">
        <span className="hm-chip-ok-icon">✓</span> Presupuesto aprobado
      </div>
    </div>
  );
}
