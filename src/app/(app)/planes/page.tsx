import { PricingSection } from "@/components/pricing-section";

// La landing (/#precios) no sirve para esto: el middleware manda a quien
// ya tiene sesión de "/" directo a la app, así que el link desde Cuenta
// nunca llegaba a los precios.
export default function PlanesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Planes</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
          Para activar Pioneros usa en la compra el mismo correo con el que te registraste.
        </p>
      </div>
      <PricingSection />
    </div>
  );
}
