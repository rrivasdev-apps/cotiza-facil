"use client";

import { useEffect, useRef, useState } from "react";
import { duplicateTemplate, setDefaultTemplate } from "@/lib/templates/actions";
import { DeleteTemplateButton } from "./delete-template-button";
import { ShareTemplateButton } from "./template-shares";

export function TemplateActionsMenu({
  templateId,
  templateName,
  isDefault,
}: {
  templateId: string;
  templateName: string;
  isDefault: boolean;
}) {
  const [open, setOpen] = useState(false);
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
          {!isDefault && (
            <form action={setDefaultTemplate.bind(null, templateId)}>
              <button type="submit" className="template-menu-item">
                Marcar como predeterminada
              </button>
            </form>
          )}
          <form action={duplicateTemplate.bind(null, templateId)}>
            <button type="submit" className="template-menu-item">
              Duplicar
            </button>
          </form>
          <ShareTemplateButton templateId={templateId} />
          <DeleteTemplateButton templateId={templateId} templateName={templateName} />
        </div>
      )}
    </div>
  );
}
