"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

// Usado por los menús "⋯" de listas (plantillas, presupuestos): si no
// queda suficiente espacio debajo del botón dentro del viewport, el
// panel se abre hacia arriba en su lugar. Sin esto, el menú de una fila
// cercana al fondo de la pantalla (típicamente la última de la lista)
// se abre hacia abajo y queda recortado por el overflow:hidden de la
// tarjeta que envuelve la lista — se ve "vacío" aunque el menú sí
// se abrió.
const PANEL_HEIGHT_ESTIMATE = 180;

export function useMenuDirection(open: boolean, triggerRef: RefObject<HTMLElement | null>): boolean {
  const [openUpward, setOpenUpward] = useState(false);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setOpenUpward(window.innerHeight - rect.bottom < PANEL_HEIGHT_ESTIMATE);
  }, [open, triggerRef]);

  return openUpward;
}
