// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Sin la variable (p. ej. en local) Sentry queda desactivado.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Separa en Sentry los errores de staging (Preview de Vercel) de los de
  // producción. Fuera de Vercel (local) cae en NODE_ENV.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Los formularios llevan nombres y correos de clientes: no se envían
  // cuerpos HTTP ni datos del usuario a Sentry.
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
