import Link from "next/link";
import { GALLERY_TEMPLATES } from "@/lib/templates/gallery";
import { createTemplateFromGallery } from "@/lib/templates/actions";

export default function GaleriaPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link href="/plantillas" style={{ color: "var(--ink-dim)", fontSize: "0.85rem" }}>
          ← Plantillas
        </Link>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Galería de plantillas</h1>
        <p style={{ color: "var(--ink-dim)" }}>
          Elegí un punto de partida y personalizalo — nombre, colores, campos y secciones se editan igual que
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
