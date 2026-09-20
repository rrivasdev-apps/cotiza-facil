"use client";

import { useState, useTransition } from "react";
import { updateTemplateTheme, uploadLogo } from "@/lib/templates/actions";
import {
  GRADIENT_DIRECTIONS,
  THEME_FONTS,
  type GradientDirection,
  type Template,
  type ThemeFont,
} from "@/lib/types";

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
  minWidth: 0,
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  font: "inherit",
  color: "var(--ink)",
};

export function Tema({ template }: { template: Template }) {
  const [accent, setAccent] = useState(template.theme.accent);
  const [gradientFrom, setGradientFrom] = useState(template.theme.gradientFrom ?? "");
  const [gradientTo, setGradientTo] = useState(template.theme.gradientTo ?? "");
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>(
    template.theme.gradientDirection ?? "diagonal-left",
  );
  const [gradientStop, setGradientStop] = useState(template.theme.gradientStop ?? 0);
  const [font, setFont] = useState<ThemeFont>(template.theme.font);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateTemplateTheme(template.id, {
          ...template.theme,
          accent,
          gradientFrom: gradientFrom || null,
          gradientTo: gradientTo || null,
          gradientDirection,
          gradientStop,
          font,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  const uploadLogoWithId = uploadLogo.bind(null, template.id);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        minWidth: 0,
      }}
    >
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}

      <div
        style={{
          background: "var(--card)",
          borderRadius: 12,
          boxShadow: "var(--sh-soft)",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          minWidth: 0,
        }}
      >
        <div style={fieldStyle}>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Logo</span>
          {/* El <form> va fuera del <label> a propósito: un <label> no
              puede contener válidamente un <form> con más de un control
              (HTML content model), y anidarlo rompe el nombre accesible
              del input y, en algunos navegadores, el propio click. */}
          <form
            action={async (formData) => {
              setError(null);
              setLogoUploading(true);
              try {
                await uploadLogoWithId(formData);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Ocurrió un error.");
              } finally {
                setLogoUploading(false);
              }
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.75rem",
              minWidth: 0,
            }}
          >
            {template.theme.logoPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.theme.logoPath}
                alt="Logo actual"
                style={{ height: 40, maxWidth: 140, borderRadius: 6, objectFit: "contain" }}
              />
            )}
            {/* En columna (no en la misma fila que el botón) a
                propósito: un <input type="file"> no se achica de forma
                confiable dentro de una fila flex en todos los
                navegadores — en su propia fila respeta max-width:100%
                sin forzar el ancho de la tarjeta. */}
            <input type="file" name="logo" accept="image/*" required style={{ maxWidth: "100%" }} />
            <button
              type="submit"
              disabled={logoUploading}
              style={{
                background: "var(--btn-primary-bg)",
                color: "var(--btn-primary-fg)",
                border: "none",
                borderRadius: 8,
                padding: "0.4rem 0.9rem",
                font: "inherit",
                cursor: logoUploading ? "default" : "pointer",
              }}
            >
              {logoUploading ? "Subiendo..." : "Subir"}
            </button>
          </form>
        </div>

        <label style={fieldStyle}>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Acento</span>
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            style={{ ...inputStyle, height: 40, padding: 4 }}
          />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <label style={{ ...fieldStyle, flex: 1, minWidth: 120 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>
              Degradado — inicio
            </span>
            <input
              type="color"
              value={gradientFrom || "#ffffff"}
              onChange={(e) => setGradientFrom(e.target.value)}
              style={{ ...inputStyle, height: 40, padding: 4 }}
            />
          </label>
          <label style={{ ...fieldStyle, flex: 1, minWidth: 120 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Degradado — fin</span>
            <input
              type="color"
              value={gradientTo || "#ffffff"}
              onChange={(e) => setGradientTo(e.target.value)}
              style={{ ...inputStyle, height: 40, padding: 4 }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setGradientFrom("");
              setGradientTo("");
            }}
            style={{
              alignSelf: "flex-end",
              background: "transparent",
              border: "none",
              color: "var(--ink-dim)",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Quitar
          </button>
        </div>

        {gradientFrom && gradientTo && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <label style={{ ...fieldStyle, flex: 1, minWidth: 160 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Dirección</span>
              <select
                value={gradientDirection}
                onChange={(e) => setGradientDirection(e.target.value as GradientDirection)}
                style={inputStyle}
              >
                {GRADIENT_DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ ...fieldStyle, flex: 1, minWidth: 160 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>
                Punto de inicio — {gradientStop}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={gradientStop}
                onChange={(e) => setGradientStop(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
          </div>
        )}

        <label style={fieldStyle}>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)" }}>Tipografía</span>
          <select
            value={font}
            onChange={(e) => setFont(e.target.value as ThemeFont)}
            style={inputStyle}
          >
            {THEME_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={save}
          disabled={pending}
          style={{
            alignSelf: "flex-start",
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            border: "none",
            borderRadius: 8,
            padding: "0.6rem 1.25rem",
            font: "inherit",
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
