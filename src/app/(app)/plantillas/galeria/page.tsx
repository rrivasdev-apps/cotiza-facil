import Link from "next/link";
import { loadAllGalleryTemplates } from "@/lib/templates/gallery-db";
import { createTemplateFromGallery } from "@/lib/templates/actions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { HelpButton } from "@/components/help-button";
import { GalleryPdfPreviewButton } from "./gallery-pdf-preview-button";
import { RemoveFromGalleryButton } from "./remove-from-gallery-button";

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
  "ejecutivo-formal": [
    "Este diseño es ordenado y serio, sin degradados ni colores llamativos.",
    "Te sirve si trabajas con contratos, obras o servicios para empresas, donde lo que más importa es que todo se vea claro y profesional.",
    "Es una buena opción para presupuestos más formales, como los que se entregan a otra empresa.",
  ],
  "pasteleria-dulce": [
    "Este diseño tiene una paleta clara y cálida, con una tabla de materiales e ingredientes y el cálculo automático del anticipo.",
    "Te sirve si vendes tortas, repostería o cualquier pedido por encargo donde necesitas desglosar los materiales usados.",
    "Es ideal para pastelerías y negocios de repostería que quieren un presupuesto con cara amigable, no un documento frío.",
  ],
};

export default async function GaleriaPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const supabase = await createClient();
  const [account, templates] = await Promise.all([getCurrentAccount(supabase), loadAllGalleryTemplates(supabase)]);

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
        {added && (
          <p style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem" }}>
            ✓ Se agregó a la galería — es esta de acá abajo, resaltada.
          </p>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {templates.map((def) => (
          <div
            key={def.key}
            id={def.key}
            style={{
              display: "flex",
              flexDirection: "column",
              background: "var(--card)",
              border: def.key === added ? "2px solid var(--accent)" : "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              boxShadow: def.key === added ? "0 0 0 4px var(--accent-soft)" : "var(--sh-soft)",
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
              {account?.isPlatformAdmin && <RemoveFromGalleryButton templateKey={def.key} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
