"use client";

import { useState, useTransition } from "react";
import { updateTemplateTheme, uploadLogo } from "@/lib/templates/actions";
import { THEME_FONTS, type Template, type ThemeFont } from "@/lib/types";

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
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
          font,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  const uploadLogoWithId = uploadLogo.bind(null, template.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 480, margin: "0 auto" }}>
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
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            {template.theme.logoPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={template.theme.logoPath}
                alt="Logo actual"
                style={{ height: 40, borderRadius: 6 }}
              />
            )}
            <input type="file" name="logo" accept="image/*" required />
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
