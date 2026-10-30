// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Sin la variable (p. ej. en local) Sentry queda desactivado.
  dsn: process.env.SENTRY_DSN,

  // Separa en Sentry los errores de staging (Preview de Vercel) de los de
  // producción. Fuera de Vercel (local) cae en NODE_ENV.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Los formularios llevan nombres y correos de clientes: no se envían
  // cuerpos HTTP ni datos del usuario a Sentry.
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});
