"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircleIcon } from "@/components/feature-icons";
import type { SectionType } from "@/lib/types";

// Tarjeta oscura en miniatura — mismo tratamiento visual que una hoja
// real del PDF (fondo oscuro, texto blanco, acento verde), a escala
// chica, para que cada ejemplo se sienta "como se va a ver" en vez de
// un diagrama abstracto.
function PreviewBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#111",
        borderRadius: 8,
        padding: "0.85rem 1rem",
        color: "#fff",
        fontFamily: "var(--font-ui)",
      }}
    >
      {children}
    </div>
  );
}

const labelSmall: React.CSSProperties = {
  fontSize: "0.6rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  opacity: 0.6,
};

function PortadaExample() {
  return (
    <PreviewBox>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: "#14a874", margin: "0 auto 0.5rem" }} />
        <div style={{ height: 2, background: "#14a874", margin: "0 auto 0.6rem", width: "55%" }} />
        <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
          PRESUPUESTO <span style={{ fontWeight: 400, opacity: 0.7 }}>Cliente Ejemplo</span>
        </div>
      </div>
    </PreviewBox>
  );
}

function TablaDatosExample() {
  return (
    <PreviewBox>
      <div style={{ ...labelSmall, marginBottom: "0.5rem" }}>Datos del Proyecto</div>
      {[
        ["Proyecto", "Remodelación de Oficinas"],
        ["Ubicación", "Zona Industrial, Nave 4"],
      ].map(([label, value]) => (
        <div key={label} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "baseline" }}>
          <div style={{ ...labelSmall, flex: "0 0 70px" }}>{label}:</div>
          <div style={{ flex: 1, fontSize: "0.7rem", borderBottom: "1px solid #14a874", paddingBottom: "0.25rem" }}>
            {value}
          </div>
        </div>
      ))}
    </PreviewBox>
  );
}

function TextoLibreExample() {
  return (
    <PreviewBox>
      <div style={{ ...labelSmall, marginBottom: "0.6rem" }}>Alcance</div>
      <div style={{ ...labelSmall, marginBottom: "0.25rem" }}>Alcance</div>
      <div style={{ fontSize: "0.7rem", lineHeight: 1.5 }}>
        Diagnóstico inicial, propuesta de mejoras y acompañamiento en la implementación.
      </div>
    </PreviewBox>
  );
}

function ListaItemsExample() {
  return (
    <PreviewBox>
      <div style={{ ...labelSmall, marginBottom: "0.6rem" }}>Lo Que Proponemos</div>
      {["Visión del Proyecto", "Nuestro Enfoque"].map((label) => (
        <div key={label} style={{ marginBottom: "0.5rem" }}>
          <div style={{ ...labelSmall, marginBottom: "0.2rem" }}>{label}</div>
          <div style={{ fontSize: "0.68rem", lineHeight: 1.4 }}>Texto de ejemplo para este bloque.</div>
        </div>
      ))}
    </PreviewBox>
  );
}

function ClausulasExample() {
  return (
    <PreviewBox>
      <div style={{ ...labelSmall, marginBottom: "0.6rem" }}>Condiciones</div>
      <div style={{ fontSize: "0.7rem", lineHeight: 1.5, marginBottom: "0.4rem" }}>
        <b>Validez:</b> 15 días desde la fecha de emisión.
      </div>
      <div style={{ fontSize: "0.7rem", lineHeight: 1.5 }}>
        <b>Forma de pago:</b> 50% al inicio, 50% contra entrega.
      </div>
    </PreviewBox>
  );
}

function CierreExample() {
  return (
    <PreviewBox>
      <div style={{ textAlign: "center", fontSize: "0.8rem", fontWeight: 600 }}>Gracias por la confianza.</div>
    </PreviewBox>
  );
}

function TablaItemsExample() {
  return (
    <PreviewBox>
      <div style={{ ...labelSmall, marginBottom: "0.5rem" }}>Presupuesto</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.6fr 1.6fr 1fr",
          fontSize: "0.58rem",
          opacity: 0.6,
          borderBottom: "1px solid rgba(255,255,255,0.25)",
          paddingBottom: "0.3rem",
          marginBottom: "0.3rem",
        }}
      >
        <span>Cant.</span>
        <span>Concepto</span>
        <span style={{ textAlign: "right" }}>Total</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "0.6fr 1.6fr 1fr", fontSize: "0.68rem", marginBottom: "0.35rem" }}>
        <span>1</span>
        <span>Servicio de ejemplo</span>
        <span style={{ textAlign: "right" }}>$ 1.500,00</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.7rem",
          fontWeight: 700,
          borderTop: "1px solid #14a874",
          paddingTop: "0.35rem",
        }}
      >
        <span>Total General:</span>
        <span>$ 1.500,00</span>
      </div>
    </PreviewBox>
  );
}

function DatosClienteExample() {
  return (
    <PreviewBox>
      <div style={{ border: "1px solid #14a874", borderRadius: 6, padding: "0.6rem 0.7rem" }}>
        {[
          ["Cliente", "Cliente Ejemplo"],
          ["Fecha", "30/9/2026"],
          ["N° Presupuesto", "0001"],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", marginBottom: "0.3rem" }}>
            <span style={{ opacity: 0.6, textTransform: "uppercase" }}>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </PreviewBox>
  );
}

function DosColumnasExample() {
  return (
    <PreviewBox>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
        <div style={{ ...labelSmall, flex: "0 0 35%" }}>Sistema:</div>
        <div style={{ flex: 1, fontSize: "0.7rem" }}>Gestión Interna</div>
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <div style={{ ...labelSmall, flex: "0 0 35%" }}>Versión:</div>
        <div style={{ flex: 1, fontSize: "0.7rem" }}>2.1.0</div>
      </div>
    </PreviewBox>
  );
}

function TituloExample() {
  return (
    <PreviewBox>
      <div style={{ height: 2, background: "#14a874", marginBottom: "0.5rem" }} />
      <div style={{ textAlign: "center", fontSize: "1rem", fontWeight: 700 }}>Un Título Grande</div>
      <div style={{ height: 2, background: "#14a874", marginTop: "0.5rem" }} />
    </PreviewBox>
  );
}

export const SECTION_TYPE_GUIDE: { type: SectionType; label: string; description: string; example: React.ReactNode }[] = [
  {
    type: "portada",
    label: "Portada",
    description:
      "La primera sección de una plantilla: muestra tu logo, una línea de color y la palabra \"PRESUPUESTO\" en grande junto al nombre del cliente. No lleva campos — el logo sale de tu Tema (o del nombre de la plantilla si todavía no subiste uno) y el nombre del cliente se completa solo al hacer el presupuesto. Lo único que puedes ajustar acá es el tamaño y estilo de ese texto. Normalmente va sola, como primera sección de la primera página.",
    example: <PortadaExample />,
  },
  {
    type: "tabla_datos",
    label: "Tabla de datos",
    description:
      "Muestra los campos que elijas en filas, cada una con su etiqueta a la izquierda y el valor subrayado a la derecha — por ejemplo Proyecto, Ubicación, Plazo de Ejecución. Es la sección más común para mostrar información puntual de cada presupuesto que no es ni el cliente ni la lista de ítems. Agrega los campos que necesites con \"Agregar campo\", eligiendo del catálogo o creando uno nuevo.",
    example: <TablaDatosExample />,
  },
  {
    type: "texto_libre",
    label: "Texto libre",
    description:
      "Un bloque de texto simple, pensado para explicaciones más largas — como el alcance de un servicio o la descripción de un proyecto. Cada campo se muestra con su nombre chico arriba y el texto grande abajo. Si marcas \"Ocultar título de la sección\", el texto se ve solo, sin el nombre de la sección encima.",
    example: <TextoLibreExample />,
  },
  {
    type: "lista_items",
    label: "Lista de ítems",
    description:
      "Se ve igual que Texto libre (nombre del campo arriba, texto abajo), pero está pensada para varios bloques seguidos — por ejemplo \"Visión del Proyecto\", \"Nuestro Enfoque\" y \"Resultados Esperados\", uno después del otro. Úsala cuando quieras contar una idea en varias partes, no solo mostrar un dato suelto.",
    example: <ListaItemsExample />,
  },
  {
    type: "clausulas",
    label: "Cláusulas",
    description:
      "Cada campo se muestra como un párrafo corto: el nombre del campo en negrita, seguido del valor en la misma línea — por ejemplo \"Validez: 15 días desde la fecha de emisión.\" Ideal para condiciones, formas de pago o cualquier lista de puntos cortos que quieras dejar por escrito.",
    example: <ClausulasExample />,
  },
  {
    type: "cierre",
    label: "Cierre",
    description:
      "Una o varias líneas de texto centradas, sin etiquetas — como \"Gracias por la confianza\" o \"Quedamos atentos a tu consulta\". Normalmente se arma con \"Agregar línea combinada\" (texto libre, sin campo del catálogo) en vez de un campo del catálogo, y va al final de una página, como despedida.",
    example: <CierreExample />,
  },
  {
    type: "tabla_items",
    label: "Ítems (cant. × precio)",
    description:
      "La tabla de ítems con cantidad, concepto, precio unitario y total — el corazón de cualquier presupuesto. No lleva campos de la plantilla: cada quien carga sus propias filas al hacer un presupuesto nuevo, y el Total General se calcula solo.",
    example: <TablaItemsExample />,
  },
  {
    type: "datos_cliente",
    label: "Datos del cliente",
    description:
      "Muestra el nombre del cliente, la fecha y el N° de presupuesto en un recuadro — se completan solos al hacer cada presupuesto, no llevan campos de la plantilla. Es habitual ponerla justo después de la portada.",
    example: <DatosClienteExample />,
  },
  {
    type: "dos_columnas",
    label: "Dos columnas",
    description:
      "Igual que Tabla de datos (etiqueta + valor), pero puedes ajustar qué tan ancha es la columna de la etiqueta contra la del valor — útil cuando el nombre de tus campos es corto y quieres que el valor tenga más espacio para respirar.",
    example: <DosColumnasExample />,
  },
  {
    type: "titulo",
    label: "Título",
    description:
      "Texto grande y centrado, con una línea de color arriba y abajo si quieres — se usa para separar visualmente una parte del documento de otra, como un subtítulo llamativo en medio de la página. El campo debe ser de texto.",
    example: <TituloExample />,
  },
];

export function SectionTypeGuideButton({ highlightType }: { highlightType?: SectionType }) {
  const [open, setOpen] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open && highlightType) {
      highlightRef.current?.scrollIntoView({ block: "start" });
    }
  }, [open, highlightType]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          background: "transparent",
          border: "1px solid var(--line)",
          color: "var(--ink-dim)",
          borderRadius: 8,
          padding: "0.4rem 0.7rem",
          font: "inherit",
          fontWeight: 600,
          fontSize: "0.75rem",
          cursor: "pointer",
        }}
      >
        <HelpCircleIcon size={14} />
        {highlightType ? "Ver ejemplo" : "Guía de tipos de sección"}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 20, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
            zIndex: 1000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Guía de tipos de sección"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--sh-soft)",
              maxWidth: 640,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    flex: "0 0 auto",
                    borderRadius: "999px",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <HelpCircleIcon size={19} />
                </span>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Guía de tipos de sección</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-dim)",
                  fontSize: "1.3rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: "0.25rem",
                }}
              >
                ×
              </button>
            </div>

            <a
              href="/tutorials/plantilla-con-items.mp4"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                alignSelf: "flex-start",
                color: "var(--accent)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              ▶ Ver video: armar una plantilla con ítems, de principio a fin
            </a>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {SECTION_TYPE_GUIDE.map((entry) => {
                const isHighlighted = entry.type === highlightType;
                return (
                  <div
                    key={entry.type}
                    ref={isHighlighted ? highlightRef : undefined}
                    className="section-guide-entry"
                    style={{
                      padding: "0.85rem",
                      margin: "-0.85rem",
                      borderRadius: "var(--radius-md)",
                      background: isHighlighted ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.35rem" }}>{entry.label}</div>
                      <p style={{ color: "var(--ink-dim)", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>
                        {entry.description}
                      </p>
                    </div>
                    {entry.example}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
