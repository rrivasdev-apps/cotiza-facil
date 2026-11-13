import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PricingSection } from "@/components/pricing-section";
import { HeroMock } from "@/components/hero-mock";
import { BrandMark } from "@/components/brand-mark";
import {
  BriefcaseIcon,
  BrushIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircleIcon,
  DressIcon,
  LinkIcon,
  PhoneIcon,
  QuestionIcon,
  SendIcon,
} from "@/components/feature-icons";

const AUDIENCES = [
  { Icon: CalendarIcon, label: "DJs y eventos" },
  { Icon: CameraIcon, label: "Fotografía" },
  { Icon: BrushIcon, label: "Maquillaje" },
  { Icon: DressIcon, label: "Diseño y confección" },
  { Icon: BriefcaseIcon, label: "Servicios profesionales" },
];

const FEATURES = [
  {
    Icon: LinkIcon,
    title: "Tu marca, en cada propuesta",
    body: "Personaliza logo, colores y tipografía.",
  },
  {
    Icon: SendIcon,
    title: "Del presupuesto al envío",
    body: "Genera tu PDF y compártelo por correo o WhatsApp.",
  },
  {
    Icon: CheckCircleIcon,
    title: "Aprobarlo es fácil",
    body: "Tu cliente aprueba desde un enlace, sin crear una cuenta.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Dale tu estilo",
    body: "Personaliza tu propuesta con tu logo, colores y tipografía.",
  },
  {
    n: "02",
    title: "Agrega los detalles",
    body: "Define los servicios, cantidades y precios de tu presupuesto.",
  },
  {
    n: "03",
    title: "Envía y recibe la aprobación",
    body: "Comparte el PDF por correo o WhatsApp y recibe la aprobación de tu cliente con un clic.",
  },
];

const FAQ = [
  {
    Icon: QuestionIcon,
    q: "¿Necesito una tarjeta para empezar?",
    a: "No. Puedes crear tu cuenta y comenzar con el plan gratis.",
  },
  {
    Icon: PhoneIcon,
    q: "¿Puedo usarlo desde mi teléfono?",
    a: "Sí. Accede desde tu computadora o teléfono.",
  },
  {
    Icon: LinkIcon,
    q: "¿Mi cliente necesita una cuenta?",
    a: "No. Puede aprobar tu presupuesto desde el enlace que recibe.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main className="landing-main">
        <section className="landing-hero">
          <div>
            <span className="landing-eyebrow">Tu talento merece una gran presentación</span>
            <h1>
              Cotiza en minutos. <em>Impresiona</em> desde el primer envío.
            </h1>
            <p className="landing-hero-sub">
              Crea presupuestos con tu marca, envíalos y facilita la aprobación de tus clientes. Desde tu
              computadora o teléfono.
            </p>
            <div className="landing-hero-ctas">
              <Link href="/signup" className="landing-btn-primary">
                Crear mi cuenta gratis <span aria-hidden="true">→</span>
              </Link>
              <Link href="/#como-funciona" className="landing-btn-secondary">
                Ver cómo funciona
              </Link>
            </div>
            <p className="landing-hero-note">Sin tarjeta de crédito · Empieza con el plan gratis</p>
          </div>

          <HeroMock />
        </section>

        <section className="landing-audience" aria-label="Para quién es">
          <div className="landing-audience-inner">
            <p className="landing-audience-title">
              Hecho para quienes <br />
              viven de su talento
            </p>
            <ul>
              {AUDIENCES.map(({ Icon, label }) => (
                <li key={label}>
                  <Icon size={26} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-section landing-band">
          <div className="landing-section-head">
            <h2>
              Menos tiempo cotizando. <br />
              Más tiempo <span className="landing-underline">para tu negocio.</span>
            </h2>
          </div>
          <div className="landing-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-card">
                <div className="landing-card-icon">
                  <f.Icon size={22} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="landing-section">
          <div className="landing-section-head">
            <h2>Tu próxima cotización, en 3 pasos.</h2>
          </div>
          <div className="landing-steps-grid">
            {STEPS.map((s, index) => (
              <div key={s.n} className="landing-step">
                <div className="landing-step-num">{s.n}</div>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <span className="landing-step-arrow" aria-hidden="true">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="precios" className="landing-section landing-band">
          <div className="landing-section-head">
            <h2>Empieza gratis. Crece a tu ritmo.</h2>
            <p>Elige el plan que acompaña a tu negocio.</p>
          </div>
          <PricingSection />
        </section>

        <section className="landing-section">
          <div className="landing-section-head landing-section-head-left">
            <h2>Antes de tu primera cotización</h2>
          </div>
          <div className="landing-faq">
            {FAQ.map(({ Icon, q, a }) => (
              <div key={q} className="landing-faq-row">
                <span className="landing-faq-icon">
                  <Icon size={20} />
                </span>
                <strong>{q}</strong>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-cta-banner">
            <h2>
              La próxima vez que te pidan un presupuesto, que tu respuesta esté a la altura de tu talento.
            </h2>
            <Link href="/signup" className="landing-btn-primary">
              Crear mi cuenta gratis <span aria-hidden="true">→</span>
            </Link>
            <p>Tu marca. Tu propuesta. Tu próximo cliente.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <BrandMark height={32} />
          <span>Presupuestos que hablan bien de tu negocio.</span>
        </div>
        <div className="landing-footer-bar">
          <span>© {new Date().getFullYear()} Cotiza Fácil</span>
          <span>
            <Link href="/login" style={{ color: "var(--ink-dim)" }}>
              Iniciar sesión
            </Link>
            {" · "}
            <Link href="/signup" style={{ color: "var(--ink-dim)" }}>
              Crear cuenta
            </Link>
            {" · "}
            <Link href="/terminos" style={{ color: "var(--ink-dim)" }}>
              Términos
            </Link>
            {" · "}
            <Link href="/privacidad" style={{ color: "var(--ink-dim)" }}>
              Privacidad
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
