"use client";

import { useEffect } from "react";

// Revela con una animación cada elemento [data-reveal] de la landing
// cuando entra en pantalla. Los estilos que ocultan los elementos
// (.reveal-on, ver globals.css) solo se activan desde acá: sin JS, o
// con "reducir movimiento" activado, todo el contenido queda visible.
export function ScrollReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing-page");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!root || prefersReducedMotion || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    root.classList.add("reveal-on");
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      root.classList.remove("reveal-on");
    };
  }, []);

  return null;
}
