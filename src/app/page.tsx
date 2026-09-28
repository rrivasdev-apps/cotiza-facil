import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { CheckCircleIcon, EnvelopeIcon, FileExportIcon, PaletteIcon } from "@/components/feature-icons";

const FEATURES = [
  {
    Icon: PaletteIcon,
    title: "Tu plantilla, tu marca",
    body: "Logo, colores, tipografía y las secciones que necesites — armas tu plantilla una vez y la reusas en todos tus presupuestos.",
  },
  {
    Icon: FileExportIcon,
    title: "PDF listo para enviar",
    body: "Se genera en el servidor con el diseño exacto de tu plantilla, sin depender del navegador del cliente.",
  },
  {
    Icon: EnvelopeIcon,
    title: "Envío directo por correo",
    body: "Con un clic el PDF le llega a tu cliente, adjunto y con el diseño de tu marca.",
  },
  {
    Icon: CheckCircleIcon,
    title: "Aprobación con un clic",
    body: "Tu cliente aprueba desde un link en el correo — sin crear cuenta, sin fricción.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Configura tu plantilla",
    body: "Logo, tema y las secciones/campos que quieras ver en cada presupuesto.",
  },
  {
    n: "2",
    title: "Carga los datos del cliente",
    body: "Nombre, ítems, condiciones — lo que definiste en la plantilla, listo para llenar.",
  },
  {
    n: "3",
    title: "Exporta y envía",
    body: "PDF, correo y aprobación del cliente, todo desde la misma consola.",
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main className="landing-main">
        <section className="landing-hero">
          <div>
            <span className="landing-eyebrow">Presupuestos con tu marca</span>
            <h1>Presupuestos que se ven tan bien como tu marca</h1>
            <p className="landing-hero-sub">
              Arma tu plantilla una vez —logo, colores, campos— y genera presupuestos en PDF, listos para
              enviar por correo, en minutos.
            </p>
            <div className="landing-hero-ctas">
              <Link href="/signup" className="landing-btn-primary">
                Crear cuenta gratis
              </Link>
              <Link href="/login" className="landing-btn-secondary">
                Iniciar sesión
              </Link>
            </div>
            <p className="landing-hero-note">No hace falta tarjeta de crédito.</p>
          </div>

          <div className="landing-mock-wrap" aria-hidden="true">
            <div className="landing-mock">
              <div className="landing-mock-top">
                <span>Nombre de tu Empresa · www.tuempresa.com</span>
              </div>
              <div className="landing-mock-rule" />
              <div className="landing-mock-title">
                PRESUPUESTO <span>Cliente Ejemplo</span>
              </div>
              <div className="landing-mock-box">
                <div className="landing-mock-row">
                  <span>Cliente</span>
                  <b>Cliente Ejemplo</b>
                </div>
                <div className="landing-mock-row">
                  <span>Fecha</span>
                  <b>28/9/2026</b>
                </div>
                <div className="landing-mock-row">
                  <span>N° Presupuesto</span>
                  <b>0001</b>
                </div>
              </div>
            </div>
            <div className="landing-mock-badge">✓ Aprobado</div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <h2>Todo lo que necesitas, en un solo lugar</h2>
            <p>Desde armar tu plantilla hasta que el cliente apruebe — sin herramientas sueltas.</p>
          </div>
          <div className="landing-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-card">
                <div className="landing-card-icon">
                  <f.Icon size={20} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-steps">
          <div className="landing-section">
            <div className="landing-section-head">
              <h2>Cómo funciona</h2>
              <p>Tres pasos, sin curva de aprendizaje.</p>
            </div>
            <div className="landing-steps-grid">
              {STEPS.map((s) => (
                <div key={s.n} className="landing-step">
                  <div className="landing-step-num">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-cta-banner">
            <h2>Empieza gratis hoy</h2>
            <p>Crea tu cuenta y arma tu primera plantilla en minutos.</p>
            <Link href="/signup" className="landing-btn-primary">
              Crear cuenta gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-bar">
          <span>© {new Date().getFullYear()} Consola de Presupuestos</span>
          <span>
            <Link href="/login" style={{ color: "var(--ink-dim)" }}>
              Iniciar sesión
            </Link>
            {" · "}
            <Link href="/signup" style={{ color: "var(--ink-dim)" }}>
              Crear cuenta
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
