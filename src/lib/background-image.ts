import type { ImageFit } from "./types";

// Los tres efectos piden mapeo directo a background-size/-repeat — sin
// lógica propia. Nombres de propiedad en camelCase a propósito: el
// mismo objeto sirve tal cual como React.CSSProperties en la vista
// previa, y se interpola a kebab-case en el HTML del PDF.
export function backgroundImageFitStyle(fit: ImageFit): {
  backgroundSize: string;
  backgroundRepeat: string;
  backgroundPosition: string;
} {
  if (fit === "tile") {
    return { backgroundSize: "auto", backgroundRepeat: "repeat", backgroundPosition: "top left" };
  }
  if (fit === "contain") {
    return { backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
  }
  return { backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
}
