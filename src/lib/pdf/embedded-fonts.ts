import { readFileSync } from "fs";
import path from "path";

// Fuentes incrustadas en el HTML del PDF (data URI) en vez de un <link> a
// Google Fonts: así el render no depende de una llamada de red externa
// dentro de Chromium. Solo subconjunto latin (cubre español).
// Los archivos viven en src/lib/pdf/fonts y next.config.ts los incluye en la
// función desplegada (outputFileTracingIncludes), porque se leen con fs.
const FONTS_DIR = path.join(process.cwd(), "src", "lib", "pdf", "fonts");

const FONT_FILES = [
  { family: "Manrope", slug: "manrope", weights: [400, 600, 700] },
  { family: "Inter", slug: "inter", weights: [400, 600, 700] },
  { family: "JetBrains Mono", slug: "jetbrains-mono", weights: [400, 500, 700] },
];

let cachedCss: string | null = null;

export function embeddedFontsCss(): string {
  if (cachedCss) return cachedCss;

  cachedCss = FONT_FILES.flatMap(({ family, slug, weights }) =>
    weights.map((weight) => {
      const base64 = readFileSync(path.join(FONTS_DIR, `${slug}-latin-${weight}-normal.woff2`)).toString("base64");
      return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${base64}) format('woff2');}`;
    }),
  ).join("\n");

  return cachedCss;
}
