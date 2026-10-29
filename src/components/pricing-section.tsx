"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon, CrossIcon, UsersIcon } from "@/components/feature-icons";

type Billing = "mensual" | "anual";

// Un solo producto en Guaybo para ambos planes de Pioneros: el periodo
// (mensual/anual) se elige dentro del checkout.
const GUAYBO_CHECKOUT_URL =
  "https://www.guaybo.com/checkout?hostAlias=simple-tech-training&productAlias=cotiza-facil&utm_source=copy_link&utm_medium=referral";

// Las 5 capacidades base del plan Pioneros — iguales en mensual y anual;
// lo que cambia entre los dos es el precio y el cupo de colaboradores.
const CORE_FEATURES = [
  "Plantillas y presupuestos ilimitados",
  "PDF con tu logo, colores y tipografía",
  "Envío por correo y por WhatsApp",
  "Aprobación del cliente con un clic",
  "Clientes y conceptos guardados",
];

const ANNUAL_EXTRAS = ["Integración con CRM Fácil"];

const PIONEROS = {
  mensual: {
    price: "$15",
    unit: "/mes",
    note: "Facturado mensualmente",
    collaborators: "1 colaborador",
    cta: "Quiero ser Pionero",
  },
  anual: {
    price: "$120",
    unit: "/año",
    note: "Equivale a $10 al mes · facturado anualmente",
    collaborators: "Hasta 5 colaboradores",
    cta: "Quiero ser Pionero",
  },
} as const;

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>("anual");
  const plan = PIONEROS[billing];

  return (
    <div className="pricing">
      <div className="pricing-toggle" role="group" aria-label="Frecuencia de pago">
        <button type="button" aria-pressed={billing === "mensual"} onClick={() => setBilling("mensual")}>
          Mensual
        </button>
        <button type="button" aria-pressed={billing === "anual"} onClick={() => setBilling("anual")}>
          Anual <span className="pricing-toggle-badge">-33%</span>
        </button>
      </div>

      <div className="pricing-grid">
        <article className="pricing-card">
          <header>
            <h3>Gratis</h3>
            <p className="pricing-tagline">Prueba la herramienta con tus primeros clientes.</p>
          </header>
          <div className="pricing-price">
            <strong>$0</strong>
          </div>
          <p className="pricing-note">Sin tarjeta de crédito</p>
          <ul className="pricing-features">
            <li>
              <CheckIcon /> 1 plantilla
            </li>
            <li>
              <CheckIcon /> 5 presupuestos
            </li>
            <li className="pricing-feature-off">
              <CrossIcon /> Plantillas y presupuestos ilimitados
            </li>
            <li className="pricing-feature-off">
              <CrossIcon /> Colaboradores en tu workspace
            </li>
            <li className="pricing-feature-off">
              <CrossIcon /> Integración con CRM Fácil
            </li>
          </ul>
          <Link href="/signup" className="landing-btn-secondary pricing-cta">
            Crear cuenta gratis
          </Link>
        </article>

        <article className="pricing-card pricing-card-featured">
          <span className="pricing-ribbon">Plan de lanzamiento</span>
          <header>
            <h3>Pioneros</h3>
            <p className="pricing-tagline">Para quienes ya cotizan en serio y quieren crecer sin límites.</p>
          </header>
          {/* key fuerza el remonte al cambiar de periodo y reinicia la animación de entrada */}
          <div key={billing} className="pricing-swap">
            <div className="pricing-price">
              <strong>{plan.price}</strong>
              <span>{plan.unit}</span>
            </div>
            <p className="pricing-note">{plan.note}</p>
            <div className="pricing-collab">
              <UsersIcon /> {plan.collaborators}
            </div>
          </div>
          <ul className="pricing-features">
            {CORE_FEATURES.map((feature) => (
              <li key={feature}>
                <CheckIcon /> {feature}
              </li>
            ))}
            {billing === "anual" &&
              ANNUAL_EXTRAS.map((feature) => (
                <li key={feature} className="pricing-feature-extra">
                  <CheckIcon /> {feature} <span className="pricing-extra-tag">Solo anual</span>
                </li>
              ))}
            {billing === "mensual" &&
              ANNUAL_EXTRAS.map((feature) => (
                <li key={feature} className="pricing-feature-off">
                  <CrossIcon /> {feature} <span className="pricing-extra-tag">Solo anual</span>
                </li>
              ))}
          </ul>
          <a href={GUAYBO_CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className="landing-btn-primary pricing-cta">
            {plan.cta}
          </a>
        </article>

        <article className="pricing-card pricing-card-soon">
          <h3>Próximamente</h3>
          <p>Estamos preparando nuevos planes para equipos más grandes y negocios con más volumen.</p>
        </article>
      </div>

      <p className="pricing-footnote">Precios en dólares (USD). Los Pioneros son los primeros planes de pago; vienen más.</p>
    </div>
  );
}
