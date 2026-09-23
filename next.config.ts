import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next intente bundlear los binarios nativos de Chromium al
  // tracear la función serverless de exportación de PDF.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
  // serverExternalPackages solo evita que el JS del paquete se transforme —
  // no garantiza que los binarios de @sparticuz/chromium (leídos vía fs en
  // runtime, no vía import/require) se copien a la función desplegada. Sin
  // esto, Vercel tira "input directory .../chromium/bin does not exist" al
  // intentar generar un PDF.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  // El default de Next (1mb) rechaza cualquier logo real (foto de
  // celular, export en alta resolución) antes de que uploadLogo() llegue
  // a correr — 4mb da margen real y se mantiene bajo el límite de
  // Vercel Hobby/Pro para el body de una función (4.5mb).
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
