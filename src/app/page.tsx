import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PricingSection } from "@/components/pricing-section";
import { HeroMock } from "@/components/hero-mock";
import { BrandMark } from "@/components/brand-mark";
import { BenefitFlipCard } from "@/components/benefit-flip-card";
import { ScrollReveal } from "@/components/scroll-reveal";
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

// Props para que ScrollReveal anime el elemento al entrar en pantalla;
// `step` escalona la entrada de elementos hermanos.
function reveal(step = 0) {
  return { "data-reveal": "", style: { "--d": `${step * 90}ms` } as React.CSSProperties };
}

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
    backBody: "Sube tu logo una vez y elige colores y tipografía. Cada presupuesto sale con tu identidad.",
    art: { src: "/landing/beneficio-marca.svg" },
  },
  {
    Icon: SendIcon,
    title: "Del presupuesto al envío",
    body: "Genera tu PDF y compártelo por correo o WhatsApp.",
    backBody: "Descarga el PDF o envíalo por correo. También puedes compartirlo por WhatsApp.",
    art: { src: "/landing/beneficio-envio.svg" },
  },
  {
    Icon: CheckCircleIcon,
    title: "Aprobarlo es fácil",
    body: "Tu cliente aprueba desde un enlace, sin crear una cuenta.",
    backBody: "Tu cliente abre el enlace, revisa y aprueba con un clic. Tú ves el estado en tu panel.",
    art: { src: "/landing/beneficio-aprobacion.svg" },
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
      <ScrollReveal />
      <PublicHeader />

      <main className="landing-main">
        <section className="landing-hero">
          <div>
            <span className="landing-eyebrow lm-rise lm-d1">
              <span className="lm-pulse" aria-hidden="true" />
              Tu talento merece una gran presentación
            </span>
            <h1 className="lm-rise lm-d2">
              Cotiza en minutos. <br />
              <em>Impresiona</em> desde <br />
              el primer envío.
            </h1>
            <p className="landing-hero-sub lm-rise lm-d3">
              Crea presupuestos con tu marca, envíalos y facilita la aprobación de tus clientes. Desde tu
              computadora o teléfono.
            </p>
            <div className="landing-hero-ctas lm-rise lm-d4">
              <Link href="/signup" className="landing-btn-primary">
                Crear mi cuenta gratis <span aria-hidden="true">→</span>
              </Link>
              <Link href="/#como-funciona" className="landing-btn-secondary">
                Ver cómo funciona
              </Link>
            </div>
            <p className="landing-hero-note lm-rise lm-d5">Sin tarjeta de crédito · Empieza con el plan gratis</p>
          </div>

          <HeroMock />
        </section>

        <section className="landing-audience" aria-label="Para quién es">
          <div className="landing-audience-inner">
            <p className="landing-audience-title">
              Hecho para quienes <br />
              viven de su talento
            </p>
            {/* Carrusel continuo: la lista va dos veces y la copia es aria-hidden. */}
            <div className="landing-ticker">
              <ul className="landing-ticker-track">
                {[0, 1].map((copy) =>
                  AUDIENCES.map(({ Icon, label }) => (
                    <li key={`${copy}-${label}`} aria-hidden={copy === 1 ? true : undefined}>
                      <Icon size={26} />
                      <span>{label}</span>
                    </li>
                  )),
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="landing-section landing-band">
          <div className="landing-section-head" {...reveal()}>
            <h2>
              Menos tiempo cotizando. <br />
              Más tiempo <span className="landing-underline">para tu negocio.</span>
            </h2>
          </div>
          <div className="landing-features">
            {FEATURES.map((f, index) => (
              <div key={f.title} {...reveal(index)}>
                <BenefitFlipCard
                  title={f.title}
                  body={f.body}
                  backBody={f.backBody}
                  art={f.art.src}
                  icon={<f.Icon size={22} />}
                />
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="landing-section">
          <div className="landing-section-head" {...reveal()}>
            <h2>Tu próxima cotización, en 3 pasos.</h2>
          </div>
          <div className="landing-steps-grid">
            {STEPS.map((s, index) => (
              <div key={s.n} {...reveal(index)}>
                <div className="landing-step">
                  <div className="landing-step-num">{s.n}</div>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <svg className="landing-step-arrow" width="36" height="14" viewBox="0 0 36 14" fill="none" aria-hidden="true">
                      <path className="lm-flow" d="M2 7H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4" />
                      <path d="M26 2l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="precios" className="landing-section landing-band">
          <div className="landing-section-head" {...reveal()}>
            <h2>Empieza gratis. Crece a tu ritmo.</h2>
            <p>Elige el plan que acompaña a tu negocio.</p>
          </div>
          <div {...reveal(1)}>
            <PricingSection />
          </div>
        </section>

        <section className="landing-section landing-faq-band">
          <div className="landing-section-head landing-section-head-left" {...reveal()}>
            <h2>Antes de tu primera cotización</h2>
          </div>
          <div className="landing-faq">
            {FAQ.map(({ Icon, q, a }) => (
              <div key={q} {...reveal(FAQ.findIndex((item) => item.q === q))}>
                <div className="landing-faq-row">
                  <span className="landing-faq-icon">
                    <Icon size={20} />
                  </span>
                  <strong>{q}</strong>
                  <p>{a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-cta-banner" {...reveal()}>
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
