"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { removeLogo, removeThemeBackgroundImage, updateTemplateTheme, uploadLogo, uploadThemeBackgroundImage } from "@/lib/templates/actions";
import {
  GRADIENT_DIRECTIONS,
  IMAGE_FIT_OPTIONS,
  THEME_FONTS,
  type GradientDirection,
  type ImageFit,
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

// Botón "chip": relleno gris claro (var(--bg), contrasta contra la
// tarjeta blanca que lo contiene) en vez de borde-sin-relleno — así
// se lee como un control táctil propio, no como texto con un aro
// alrededor. Mismo radio/alto para la variante con ícono+texto
// (Reemplazar) y la variante solo-ícono (Quitar), para que ambas
// queden alineadas en la misma fila.
const chipButtonStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  color: "var(--ink)",
  cursor: "pointer",
  font: "inherit",
  fontSize: "0.8125rem",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem",
  height: 38,
  padding: "0 0.85rem",
  flexShrink: 0,
};

const iconOnlyChipButtonStyle: React.CSSProperties = {
  ...chipButtonStyle,
  width: 38,
  padding: 0,
  color: "var(--ink-dim)",
};

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

// Miniatura + botones de ícono (reemplazar / borrar), reutilizado para
// Logo e Imagen de fondo — mismo patrón visual, pero cada uno le pasa
// su propia acción de subida/borrado y su propio ajuste de miniatura
// (el logo se ve completo con "contain"; el fondo llena el recuadro
// con "cover"). El <input type="file"> queda oculto: el botón de
// ícono lo dispara por ref — así el selector nativo del navegador no
// rompe el layout compacto. Elegir un archivo no sube nada todavía
// (decisión explícita): aparece una barra de confirmación con el
// nombre del archivo y un botón "Subir" aparte, igual que el flujo
// anterior con <input type="file"> visible.
function ImageUploadControl({
  label,
  currentImagePath,
  fieldName,
  thumbnailFit,
  uploadAction,
  onRemove,
  removing,
}: {
  label: string;
  currentImagePath: string | null | undefined;
  fieldName: string;
  thumbnailFit: "contain" | "cover";
  uploadAction: (formData: FormData) => Promise<void>;
  onRemove?: () => void;
  removing?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (pendingFile ? URL.createObjectURL(pendingFile) : null), [pendingFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const resetSelection = () => {
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={fieldStyle}>
      <span style={smallLabelStyle}>{label}</span>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</p>}
      <form
        action={async (formData) => {
          setError(null);
          setUploading(true);
          try {
            await uploadAction(formData);
            resetSelection();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Ocurrió un error.");
          } finally {
            setUploading(false);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          name={fieldName}
          accept="image/*"
          required
          style={{ display: "none" }}
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {previewUrl || currentImagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl ?? currentImagePath ?? undefined}
              alt={`${label} actual`}
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-md)",
                objectFit: thumbnailFit,
                border: "1px solid var(--line)",
                boxShadow: "var(--sh-soft)",
                background: "var(--card)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--line-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-faint)",
                flexShrink: 0,
              }}
            >
              <ImagePlaceholderIcon />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button type="button" onClick={() => inputRef.current?.click()} style={chipButtonStyle}>
              <UploadIcon />
              Reemplazar
            </button>
            {onRemove && currentImagePath && !pendingFile && (
              <button
                type="button"
                aria-label="Quitar"
                title="Quitar"
                onClick={onRemove}
                disabled={removing}
                style={{ ...iconOnlyChipButtonStyle, cursor: removing ? "default" : "pointer" }}
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </div>
        {pendingFile && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.6rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--ink-faint)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 140,
              }}
            >
              {pendingFile.name}
            </span>
            <button
              type="submit"
              disabled={uploading}
              style={{
                background: "var(--btn-primary-bg)",
                color: "var(--btn-primary-fg)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0.4rem 0.85rem",
                font: "inherit",
                fontWeight: 700,
                fontSize: "0.8125rem",
                cursor: uploading ? "default" : "pointer",
              }}
            >
              {uploading ? "Subiendo..." : "Subir"}
            </button>
            <button
              type="button"
              onClick={resetSelection}
              disabled={uploading}
              style={{
                background: "transparent",
                border: "none",
                font: "inherit",
                fontSize: "0.8125rem",
                color: "var(--ink-faint)",
                cursor: uploading ? "default" : "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

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
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [bgImageRemoving, setBgImageRemoving] = useState(false);

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
  const uploadBgImageWithId = uploadThemeBackgroundImage.bind(null, template.id);
  const hasGradient = Boolean(theme.gradientFrom && theme.gradientTo);

  const removeLogoImage = () => {
    setError(null);
    setLogoRemoving(true);
    startTransition(async () => {
      try {
        await removeLogo(template.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      } finally {
        setLogoRemoving(false);
      }
    });
  };

  const removeBgImage = () => {
    setError(null);
    setBgImageRemoving(true);
    startTransition(async () => {
      try {
        await removeThemeBackgroundImage(template.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      } finally {
        setBgImageRemoving(false);
      }
    });
  };

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
        <ImageUploadControl
          label="Logo"
          currentImagePath={template.theme.logoPath}
          fieldName="logo"
          thumbnailFit="contain"
          uploadAction={uploadLogoWithId}
          onRemove={removeLogoImage}
          removing={logoRemoving}
        />

        <div style={fieldStyle}>
          <ImageUploadControl
            label="Imagen de fondo"
            currentImagePath={theme.backgroundImage.imagePath}
            fieldName="image"
            thumbnailFit="cover"
            uploadAction={uploadBgImageWithId}
            onRemove={removeBgImage}
            removing={bgImageRemoving}
          />
          {theme.backgroundImage.imagePath && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem" }}>
              <label style={{ ...fieldStyle, flex: 1, minWidth: 160 }}>
                <span style={smallLabelStyle}>Opacidad — {theme.backgroundImage.opacity}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={theme.backgroundImage.opacity}
                  onChange={(e) => patch({ backgroundImage: { ...theme.backgroundImage, opacity: Number(e.target.value) } })}
                  style={{ width: "100%" }}
                />
              </label>
              <label style={{ ...fieldStyle, flex: 1, minWidth: 160 }}>
                <span style={smallLabelStyle}>Efecto</span>
                <select
                  value={theme.backgroundImage.fit}
                  onChange={(e) => patch({ backgroundImage: { ...theme.backgroundImage, fit: e.target.value as ImageFit } })}
                  style={inputStyle}
                >
                  {IMAGE_FIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
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
