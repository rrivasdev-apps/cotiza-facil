"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deletePresupuesto, duplicatePresupuesto } from "@/lib/presupuestos/actions";

export function PresupuestoActionsMenu({
  presupuestoId,
  clientName,
}: {
  presupuestoId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const onDelete = () => {
    if (!window.confirm(`¿Eliminar el presupuesto de "${clientName}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deletePresupuesto(presupuestoId);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Más acciones"
        aria-haspopup="true"
        aria-expanded={open}
        className="template-menu-trigger"
      >
        ⋯
      </button>
      {open && (
        <div className="template-menu-panel">
          <form
            action={duplicatePresupuesto.bind(null, presupuestoId)}
            onSubmit={(e) => {
              if (!window.confirm(`¿Duplicar el presupuesto de "${clientName}"?`)) e.preventDefault();
            }}
          >
            <button type="submit" className="template-menu-item">
              Duplicar
            </button>
          </form>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="template-menu-item template-menu-item-danger"
            style={{ cursor: pending ? "default" : "pointer" }}
          >
            {pending ? "Eliminando..." : "Eliminar"}
          </button>
          {error && (
            <span style={{ color: "var(--danger)", fontSize: "0.7rem", padding: "0 0.7rem" }}>{error}</span>
          )}
        </div>
      )}
    </div>
  );
}
