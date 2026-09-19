import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next intente bundlear los binarios nativos de Chromium al
  // tracear la función serverless de exportación de PDF.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
};

export default nextConfig;
