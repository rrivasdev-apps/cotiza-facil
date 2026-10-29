import { withSentryConfig } from "@sentry/nextjs/config";
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
    "/*": ["./node_modules/@sparticuz/chromium/bin/**/*", "./src/lib/pdf/fonts/**/*"],
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/uploading/bundler-plugin-options/

  org: "simple-tech-training",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Sin tunnelRoute a propósito: /monitoring pasaría por proxy.ts, que manda
  // a /login a quien no tiene sesión, y se perderían los errores de las
  // páginas públicas (aprobación, login).

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
