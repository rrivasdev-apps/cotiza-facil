"use client";

import { useState } from "react";
import Link from "next/link";
import { GalleryIcon, GiftIcon, SparkleIcon } from "@/components/feature-icons";
import { NewTemplateForm } from "./new-template-form";
import { IncomingShares } from "./template-shares";
import type { TemplateShare } from "@/lib/types";

const ctaButtonStyle: React.CSSProperties = {
  marginTop: "auto",
  alignSelf: "flex-start",
  background: "var(--btn-primary-bg)",
  color: "var(--btn-primary-fg)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "0.65rem 1.1rem",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
};

// Botón simple que revela el formulario al hacer clic — en vez de
// mostrar siempre el input, para que las tres tarjetas arranquen con
// la misma forma (icono, título, texto, un botón) y los tres botones
// queden a la misma altura. Mismo patrón que ShareTemplateButton en
// template-shares.tsx.
function CreateFromScratchCta() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={ctaButtonStyle}>
        Crear plantilla
      </button>
    );
  }
  return (
    <div style={{ marginTop: "auto" }}>
      <NewTemplateForm />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  background: "var(--card)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--sh-soft)",
  padding: "1.5rem",
};

const iconBadgeStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "var(--radius-md)",
  background: "var(--accent-soft)",
  color: "var(--accent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
};

// Primera pantalla que ve una cuenta sin ninguna plantilla todavía —
// nada más importante para que alguien se quede con la app que este
// primer minuto. Tres caminos, ninguno más "correcto" que otro: de la
// galería (rápido), desde cero (control total), o que te la compartan
// (cero esfuerzo si ya conoces a alguien que la usa) — ver
// template-shares.tsx para ese último.
export function TemplatesOnboarding({ incomingShares }: { incomingShares: TemplateShare[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.01em" }}>Arma tu primera plantilla</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: "1rem", maxWidth: 480, margin: "0 auto" }}>
          Con una plantilla lista, generar un presupuesto nuevo te toma minutos: logo, colores y campos ya
          quedan armados una sola vez.
        </p>
      </div>

      {incomingShares.length > 0 && <IncomingShares shares={incomingShares} />}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.25rem",
        }}
      >
        <div style={cardStyle}>
          <div style={iconBadgeStyle}>
            <GalleryIcon size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>Elegir de la galería</span>
            <span style={{ color: "var(--ink-dim)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Arranca con un diseño ya armado — colores, secciones y campos — y ajústalo a tu gusto.
            </span>
          </div>
          <Link href="/plantillas/galeria" style={ctaButtonStyle}>
            Ver la galería
          </Link>
        </div>

        <div style={cardStyle}>
          <div style={iconBadgeStyle}>
            <SparkleIcon size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>Crear desde cero</span>
            <span style={{ color: "var(--ink-dim)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Arma tu propia estructura, sección por sección y campo por campo, a tu manera.
            </span>
          </div>
          <CreateFromScratchCta />
        </div>

        <div style={cardStyle}>
          <div style={iconBadgeStyle}>
            <GiftIcon size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>Pide que te compartan una</span>
            <span style={{ color: "var(--ink-dim)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              ¿Conoces a alguien que ya usa la app? Pídele que abra su lista de Plantillas y use
              &quot;Compartir&quot; con tu correo — te va a llegar acá mismo para aceptarla.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
