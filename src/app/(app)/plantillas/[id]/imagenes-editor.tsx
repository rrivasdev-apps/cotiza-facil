"use client";

import { useRef, useState } from "react";
import { moveSectionImage, removeSectionImage, updateSectionImagenes, uploadSectionImage } from "@/lib/templates/actions";
import { ALIGN_H_OPTIONS, getImagenesConfig, type ImagenesConfig } from "@/lib/types";

type Runner = (fn: () => Promise<unknown>) => void;

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const controlStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.45rem 0.65rem",
  font: "inherit",
  fontSize: "0.85rem",
};

const smallButtonStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.15rem 0.5rem",
  font: "inherit",
  fontSize: "0.75rem",
  cursor: "pointer",
};

// Imágenes fijas de la plantilla (iguales en todos los presupuestos):
// una cuadrícula de 1 a 4 columnas. Cada cambio se guarda al momento,
// igual que el resto de los ajustes de Estructura.
export function ImagenesEditor({
  templateId,
  sectionId,
  config,
  run,
}: {
  templateId: string;
  sectionId: string;
  config: Record<string, unknown>;
  run: Runner;
}) {
  const settings = getImagenesConfig(config);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gap, setGap] = useState(String(settings.gap));
  const [height, setHeight] = useState(settings.height === null ? "" : String(settings.height));

  // Solo se manda lo que cambió y el servidor lo combina con lo guardado:
  // si se mandaran las 4 opciones desde el estado de pantalla, dos cambios
  // seguidos (antes de que la página se refresque) harían que el segundo
  // guardado pise el primero con valores viejos.
  const save = (patch: Partial<Pick<ImagenesConfig, "columns" | "gap" | "height" | "fit" | "align">>) =>
    run(() => updateSectionImagenes(templateId, sectionId, patch));

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    // Una por una y en orden: cada subida relee y reescribe la config de
    // la sección, en paralelo se pisarían entre sí.
    run(async () => {
      for (const file of picked) {
        const formData = new FormData();
        formData.append("image", file);
        await uploadSectionImage(templateId, sectionId, formData);
      }
    });
    // Sin esto, volver a elegir el mismo archivo no dispararía onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>
        Imágenes fijas de la plantilla (sellos, firmas, banners): salen iguales en todos los presupuestos. Se ordenan
        en una cuadrícula; PNG, JPG o WebP de hasta 4 MB.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={labelStyle}>Columnas</span>
          <select
            value={settings.columns}
            onChange={(e) => save({ columns: Number(e.target.value) as ImagenesConfig["columns"] })}
            style={controlStyle}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={labelStyle}>Separación (px)</span>
          <input
            type="number"
            min={0}
            max={48}
            value={gap}
            onChange={(e) => setGap(e.target.value)}
            onBlur={() => save({ gap: Number(gap) || 0 })}
            style={{ ...controlStyle, width: 110 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={labelStyle}>Alto de celda (px)</span>
          <input
            type="number"
            min={40}
            max={600}
            value={height}
            placeholder="Natural"
            onChange={(e) => setHeight(e.target.value)}
            onBlur={() => save({ height: height.trim() === "" ? null : Number(height) })}
            style={{ ...controlStyle, width: 130 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={labelStyle}>Alineación</span>
          <select value={settings.align} onChange={(e) => save({ align: e.target.value as ImagenesConfig["align"] })} style={controlStyle}>
            {ALIGN_H_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={labelStyle}>Ajuste</span>
          <select value={settings.fit} onChange={(e) => save({ fit: e.target.value as ImagenesConfig["fit"] })} style={controlStyle}>
            <option value="contain">Entera (sin recortar)</option>
            <option value="cover">Llenar la celda (recorta)</option>
          </select>
        </label>
      </div>

      {settings.images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.6rem" }}>
          {settings.images.map((image, index) => (
            <div
              key={image.url}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem",
                background: "var(--bg)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de una URL pública de Storage */}
              <img src={image.url} alt={image.alt} style={{ width: "100%", height: 80, objectFit: "contain" }} />
              <div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
                <button
                  type="button"
                  style={smallButtonStyle}
                  disabled={index === 0}
                  aria-label="Mover antes"
                  onClick={() => run(() => moveSectionImage(templateId, sectionId, index, -1))}
                >
                  ←
                </button>
                <button
                  type="button"
                  style={smallButtonStyle}
                  disabled={index === settings.images.length - 1}
                  aria-label="Mover después"
                  onClick={() => run(() => moveSectionImage(templateId, sectionId, index, 1))}
                >
                  →
                </button>
                <button
                  type="button"
                  style={smallButtonStyle}
                  aria-label="Quitar imagen"
                  onClick={() => run(() => removeSectionImage(templateId, sectionId, index))}
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: "none" }}
          aria-label="Subir imágenes"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ ...smallButtonStyle, padding: "0.5rem 0.9rem", fontSize: "0.85rem", fontWeight: 700 }}
        >
          + Agregar imágenes
        </button>
      </div>
    </div>
  );
}
