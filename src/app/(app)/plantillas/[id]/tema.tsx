"use client";

import { useState, useTransition } from "react";
import { updateTemplateTheme, uploadLogo } from "@/lib/templates/actions";
import {
  GRADIENT_DIRECTIONS,
  THEME_FONTS,
  type GradientDirection,
  type Template,
  type TemplateTheme,
  type ThemeFont,
} from "@/lib/types";

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
  minWidth: 0,
};

const inputStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.5rem 0.75rem",
  font: "inherit",
  color: "var(--ink)",
};

const smallLabelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

// Controlado desde TemplateEditor (no state local) porque el tema en
// edición, aunque todavía no se haya guardado, tiene que llegar a la
// vista previa en vivo igual que una sección ya guardada — ver
// TemplatePreview.
export function Tema({
  template,
  theme,
  onThemeChange,
}: {
  template: Template;
  theme: TemplateTheme;
  onThemeChange: (next: TemplateTheme) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const patch = (partial: Partial<TemplateTheme>) => onThemeChange({ ...theme, ...partial });

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateTemplateTheme(template.id, {
          ...theme,
          gradientFrom: theme.gradientFrom || null,
          gradientTo: theme.gradientTo || null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  const uploadLogoWithId = uploadLogo.bind(null, template.id);
  const hasGradient = Boolean(theme.gradientFrom && theme.gradientTo);

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
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--sh-soft)",
          padding: "1.35rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          minWidth: 0,
        }}
      >
        <div style={fieldStyle}>
          <span style={smallLabelStyle}>Logo</span>
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
                borderRadius: "var(--radius-md)",
                padding: "0.45rem 0.95rem",
                font: "inherit",
                fontWeight: 700,
                cursor: logoUploading ? "default" : "pointer",
              }}
            >
              {logoUploading ? "Subiendo..." : "Subir"}
            </button>
          </form>
        </div>

        <label style={fieldStyle}>
          <span style={smallLabelStyle}>Acento</span>
          <input
            type="color"
            value={theme.accent}
            onChange={(e) => patch({ accent: e.target.value })}
            style={{ ...inputStyle, height: 40, padding: 4 }}
          />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <label style={{ ...fieldStyle, flex: 1, minWidth: 120 }}>
            <span style={smallLabelStyle}>Color de fondo</span>
            <input
              type="color"
              value={theme.bgColor}
              onChange={(e) => patch({ bgColor: e.target.value })}
              style={{ ...inputStyle, height: 40, padding: 4 }}
            />
          </label>
          <label style={{ ...fieldStyle, flex: 1, minWidth: 120 }}>
            <span style={smallLabelStyle}>Color de texto</span>
            <input
              type="color"
              value={theme.textColor}
              onChange={(e) => patch({ textColor: e.target.value })}
              style={{ ...inputStyle, height: 40, padding: 4 }}
            />
          </label>
        </div>
        {/* bgColor se usa solo sin degradado — con degradado, el fondo
            de la hoja es el degradado completo (ver pageBackground en
            los tres renderers), este color queda de respaldo. */}
        {hasGradient && (
          <span style={{ color: "var(--ink-faint)", fontSize: "0.75rem", marginTop: "-0.75rem" }}>
            Con degradado activo, el color de fondo no se usa — el degradado cubre toda la hoja.
          </span>
        )}

        <span style={{ ...smallLabelStyle, marginBottom: "-0.5rem" }}>
          {hasGradient && theme.alternatePageTheme ? "Tema — página impar" : "Degradado"}
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <label style={{ ...fieldStyle, flex: 1, minWidth: 120 }}>
            <span style={smallLabelStyle}>
              Degradado — inicio
            </span>
            <input
              type="color"
              value={theme.gradientFrom || "#ffffff"}
              onChange={(e) => patch({ gradientFrom: e.target.value })}
              style={{ ...inputStyle, height: 40, padding: 4 }}
            />
          </label>
          <label style={{ ...fieldStyle, flex: 1, minWidth: 120 }}>
            <span style={smallLabelStyle}>Degradado — fin</span>
            <input
              type="color"
              value={theme.gradientTo || "#ffffff"}
              onChange={(e) => patch({ gradientTo: e.target.value })}
              style={{ ...inputStyle, height: 40, padding: 4 }}
            />
          </label>
          <button
            type="button"
            onClick={() => patch({ gradientFrom: "", gradientTo: "" })}
            style={{
              alignSelf: "flex-end",
              background: "var(--card)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.85rem",
              color: "var(--ink)",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
              fontSize: "0.8125rem",
            }}
          >
            Quitar
          </button>
        </div>

        {hasGradient && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <label style={{ ...fieldStyle, flex: 1, minWidth: 160 }}>
                <span style={smallLabelStyle}>Dirección</span>
                <select
                  value={theme.gradientDirection}
                  onChange={(e) => patch({ gradientDirection: e.target.value as GradientDirection })}
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
                <span style={smallLabelStyle}>
                  Punto de inicio — {theme.gradientStop}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={theme.gradientStop}
                  onChange={(e) => patch({ gradientStop: Number(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </label>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--ink)" }}>
              <input
                type="checkbox"
                checked={theme.alternatePageTheme}
                onChange={(e) => patch({ alternatePageTheme: e.target.checked })}
              />
              Alternar inicio/fin en páginas pares (2ª, 4ª...)
            </label>

            {theme.alternatePageTheme && (
              <div style={fieldStyle}>
                <span style={smallLabelStyle}>Tema — página par (automático)</span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.5rem 0.75rem",
                  }}
                >
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: theme.gradientTo ?? undefined, border: "1px solid var(--line-strong)" }} />
                  <span style={{ color: "var(--ink-faint)", fontSize: "0.8rem" }}>→</span>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: theme.gradientFrom ?? undefined, border: "1px solid var(--line-strong)" }} />
                  <span style={{ color: "var(--ink-faint)", fontSize: "0.75rem", marginLeft: "0.25rem" }}>
                    (inicio y fin invertidos)
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        <label style={fieldStyle}>
          <span style={smallLabelStyle}>Tipografía</span>
          <select
            value={theme.font}
            onChange={(e) => patch({ font: e.target.value as ThemeFont })}
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
            borderRadius: "var(--radius-md)",
            padding: "0.65rem 1.35rem",
            boxShadow: "var(--sh-soft)",
            font: "inherit",
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
