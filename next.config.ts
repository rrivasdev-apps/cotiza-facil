import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next intente bundlear los binarios nativos de Chromium al
  // tracear la función serverless de exportación de PDF.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
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
