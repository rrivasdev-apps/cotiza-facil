"use client";

import { useEffect } from "react";

// Feedback global de "la app está trabajando". En vez de tocar los ~170
// botones de la app, escucha los clics y envuelve window.fetch:
//
// - Si un clic/submit dispara una petición (server action de Next, ruta
//   /api o navegación RSC) dentro de CLICK_WINDOW_MS, ese botón recibe
//   data-loading (spinner + bloqueado, ver globals.css) y <html> recibe
//   data-busy (barra de progreso arriba) hasta que terminen todas las
//   peticiones que se estaban siguiendo.
// - Las peticiones que NO vienen de un clic (prefetch de enlaces, la
//   vista previa del editor que se recalcula sola con debounce) se
//   ignoran a propósito: no deben encender la barra ni bloquear nada.
const CLICK_WINDOW_MS = 600;
// Margen tras la última respuesta: React todavía está re-renderizando.
const SETTLE_MS = 150;

type Trigger = { button: HTMLElement | null; at: number };

export function BusyFeedback() {
  useEffect(() => {
    const originalFetch = window.fetch;
    let trigger: Trigger | null = null;
    let inFlight = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const loadingButtons = new Set<HTMLElement>();

    const rememberTrigger = (target: EventTarget | null, submitter?: HTMLElement | null) => {
      const element = target instanceof Element ? target : null;
      const button =
        submitter ?? (element?.closest("button, [role='button'], input[type='submit']") as HTMLElement | null);
      const link = element?.closest("a[href]");
      // Un clic suelto sobre texto no es un disparador.
      if (!button && !link) return;
      trigger = { button: button && !(button as HTMLButtonElement).disabled ? button : null, at: Date.now() };
    };

    const onClick = (event: MouseEvent) => rememberTrigger(event.target);
    // Enter dentro de un formulario envía sin clic: el submitter es el botón.
    const onSubmit = (event: SubmitEvent) => rememberTrigger(event.target, event.submitter);

    const start = (button: HTMLElement | null) => {
      clearTimeout(settleTimer);
      inFlight += 1;
      document.documentElement.dataset.busy = "true";
      if (button?.isConnected) {
        button.dataset.loading = "true";
        loadingButtons.add(button);
      }
    };

    const finish = () => {
      inFlight = Math.max(0, inFlight - 1);
      if (inFlight > 0) return;
      settleTimer = setTimeout(() => {
        delete document.documentElement.dataset.busy;
        for (const button of loadingButtons) delete button.dataset.loading;
        loadingButtons.clear();
      }, SETTLE_MS);
    };

    window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      const isPrefetch = headers.has("next-router-prefetch");
      const fromClick = trigger !== null && Date.now() - trigger.at < CLICK_WINDOW_MS;
      // Navegación entre páginas (RSC) también cuenta, venga o no de un botón.
      const isNavigation = headers.has("rsc") && !headers.has("next-action");

      const promise = originalFetch.call(window, input, init);
      if (!isPrefetch && (fromClick || isNavigation)) {
        start(fromClick ? trigger!.button : null);
        promise.then(finish, finish);
      }
      return promise;
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      clearTimeout(settleTimer);
    };
  }, []);

  return null;
}
