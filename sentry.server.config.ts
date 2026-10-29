// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Sin la variable (p. ej. en local) Sentry queda desactivado.
  dsn: process.env.SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Los formularios llevan nombres y correos de clientes: no se envían
  // cuerpos HTTP ni datos del usuario a Sentry.
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});
