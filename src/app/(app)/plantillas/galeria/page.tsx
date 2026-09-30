import Link from "next/link";
import { GALLERY_TEMPLATES } from "@/lib/templates/gallery";
import { createTemplateFromGallery } from "@/lib/templates/actions";
import { HelpButton } from "@/components/help-button";
import { GalleryPdfPreviewButton } from "./gallery-pdf-preview-button";

const HELP_STEPS = [
  "Acá hay diseños ya armados, listos para usar.",
  "Mira la imagen y la descripción de cada uno para ver cuál se parece más a lo que necesitas.",
  "Toca \"¿Para qué sirve?\" para que te expliquen, fácil, para qué tipo de negocio conviene cada diseño.",
  "Toca \"Ver PDF de ejemplo\" para ver cómo se ve ese diseño ya lleno, como si fuera un presupuesto real.",
  "Toca \"Usar esta plantilla\" para copiarlo a tu cuenta — a partir de ahí es tuyo, lo puedes cambiar como quieras (nombre, colores, secciones, campos) sin afectar al original de la galería.",
];

// Explicación de cada plantilla en lenguaje simple, para quien nunca
// armó un presupuesto — qué tiene de especial y para qué tipo de
// negocio conviene. Se muestra en el botón "¿Para qué sirve?" de cada
// tarjeta (reusa el modal de HelpButton).
const TEMPLATE_USAGE_HELP: Record<string, string[]> = {
  "minimalista-oscuro": [
    "Este diseño es bien sencillo: fondo oscuro, casi sin colores ni dibujos, con mucho espacio en blanco.",
    "Te sirve si ofreces un servicio y quieres que el cliente se fije en las palabras, no en decoraciones.",
    "Funciona muy bien para consultoría, asesorías y servicios profesionales, donde lo importante es que se vea serio y claro.",
  ],
  "oscuro-degradado": [
    "Este diseño tiene un fondo oscuro con un degradado de color que cambia de página en página.",
    "Te sirve si tu marca tiene colores fuertes y quieres que se noten desde el primer vistazo.",
    "Es una buena opción para negocios con una identidad visual marcada, como agencias o marcas creativas.",
  ],
  "ejecutivo-formal": [
    "Este diseño es ordenado y serio, sin degradados ni colores llamativos.",
    "Te sirve si trabajas con contratos, obras o servicios para empresas, donde lo que más importa es que todo se vea claro y profesional.",
    "Es una buena opción para presupuestos más formales, como los que se entregan a otra empresa.",
  ],
  "items-cotizacion": [
    "Este diseño pone en el centro la tabla de ítems: cantidad, precio y total de cada cosa que cotizas.",
    "Te sirve si vendes productos o trabajos que se cobran por partida, como materiales, piezas o servicios por unidad.",
    "Es ideal cuando el cliente necesita ver bien desglosado cada ítem, no solo un monto total.",
  ],
  "evento-creativo": [
    "Este diseño tiene colores vivos, un degradado llamativo y una portada grande.",
    "Te sirve si organizas eventos, tomas fotos o haces algo creativo, donde la primera impresión visual importa mucho.",
    "Es perfecto para DJs, fotógrafos, organizadores de fiestas y cualquier negocio donde lo visual es parte del servicio.",
  ],
  "contrato-tecnico": [
    "Este diseño usa una tipografía de código (como la de una computadora) y un acento de color neón sobre fondo negro.",
    "Te sirve si trabajas con programación, sistemas o integraciones técnicas.",
    "Es ideal para presupuestos que incluyen datos como versión, sistema o nivel de soporte.",
  ],
  "presupuesto-de-lujo": [
    "Este diseño tiene un degradado dorado y un encabezado con logo, para que se vea elegante y de alto nivel.",
    "Te sirve si ofreces un producto o servicio premium, donde el cliente espera algo más exclusivo.",
    "Funciona muy bien con una lista de beneficios incluidos, para mostrar todo lo que el cliente recibe.",
  ],
  "recibo-compacto": [
    "Este diseño es corto y directo: una sola página, con el monto bien grande para que se note enseguida.",
    "Te sirve para cobros rápidos o recibos de pago, no para presupuestos largos con muchos detalles.",
    "Es ideal cuando solo necesitas dejar constancia de un pago recibido, de forma simple.",
  ],
  "propuesta-editorial": [
    "Este diseño usa letras grandes y en negrita, con un degradado de color en bloque — se ve como una revista.",
    "Te sirve si trabajas en branding, diseño o cualquier propuesta creativa donde las palabras también son parte del diseño.",
    "Es una buena opción cuando quieres contar una idea, no solo mostrar precios.",
  ],
  "cotizacion-calculo": [
    "Este diseño calcula solo el subtotal, el IVA y el total a partir de los ítems que cargues — no tienes que sacar cuentas a mano.",
    "También escribe el monto total en letras, como en una factura formal, sin que tengas que escribirlo tú.",
    "Te sirve si trabajas en ingeniería o proyectos técnicos, donde los presupuestos necesitan ese nivel de detalle.",
  ],
};

export default function GaleriaPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link href="/plantillas" style={{ color: "var(--ink-dim)", fontSize: "0.85rem" }}>
          ← Plantillas
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Galería de plantillas</h1>
          <HelpButton title="Cómo usar la Galería" steps={HELP_STEPS} />
        </div>
        <p style={{ color: "var(--ink-dim)" }}>
          Elige un punto de partida y personalízalo — nombre, colores, campos y secciones se editan igual que
          cualquier otra plantilla.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {GALLERY_TEMPLATES.map((def) => (
          <div
            key={def.key}
            style={{
              display: "flex",
              flexDirection: "column",
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--sh-soft)",
              overflow: "hidden",
            }}
          >
            <div style={{ background: "#111", maxHeight: 260, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={def.previewImage}
                alt={`Vista previa de la plantilla ${def.name}`}
                style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "top" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "1rem 1.1rem" }}>
              <span style={{ fontWeight: 700 }}>{def.name}</span>
              <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem", margin: 0 }}>{def.description}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <HelpButton
                  variant="button"
                  label="¿Para qué sirve?"
                  title={def.name}
                  steps={TEMPLATE_USAGE_HELP[def.key] ?? [def.description]}
                />
                <GalleryPdfPreviewButton templateKey={def.key} />
              </div>
              <form action={createTemplateFromGallery.bind(null, def.key)}>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-fg)",
                    border: "none",
                    borderRadius: 8,
                    padding: "0.6rem 1rem",
                    font: "inherit",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Usar esta plantilla
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
