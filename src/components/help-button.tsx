"use client";

import { useEffect, useState } from "react";
import { HelpCircleIcon } from "./feature-icons";

// Modal de ayuda reusable: un icono "?" (o, con variant="button", un
// botón de ancho completo) que abre el mismo modal con título/intro/
// pasos — usado tanto junto al título de cada página como, en la
// Galería, para explicar el uso de cada plantilla.
export function HelpButton({
  title,
  intro,
  steps,
  variant = "icon",
  label,
}: {
  title: string;
  intro?: string;
  steps: string[];
  variant?: "icon" | "button";
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            background: "transparent",
            border: "1px solid var(--line)",
            color: "var(--ink-dim)",
            borderRadius: 8,
            padding: "0.55rem 1rem",
            font: "inherit",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          <HelpCircleIcon size={15} />
          {label ?? title}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ayuda: cómo se usa esta pantalla"
          style={{
            width: 30,
            height: 30,
            flex: "0 0 auto",
            borderRadius: "999px",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <HelpCircleIcon size={17} />
        </button>
      )}
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
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--sh-soft)",
              maxWidth: 440,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
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
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{title}</h2>
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

            {intro && <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>{intro}</p>}

            <ol style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingLeft: "1.25rem", margin: 0 }}>
              {steps.map((step, i) => (
                <li key={i} style={{ color: "var(--ink)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
