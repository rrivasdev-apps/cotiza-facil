"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPresupuestoPdfUrl, sendPresupuesto, sendPresupuestoHtml } from "@/lib/presupuestos/actions";

const buttonStyle: React.CSSProperties = {
  background: "var(--btn-primary-bg)",
  color: "var(--btn-primary-fg)",
  border: "none",
  borderRadius: 8,
  padding: "0.6rem 1.25rem",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};

const accentButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "var(--accent)",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: "var(--ink-dim)",
  boxShadow: "var(--sh-soft)",
};

export function ExportPdfButton({
  presupuestoId,
  hasPdf,
  clientEmail,
  emailConfigured,
  hasSenderEmail,
}: {
  presupuestoId: string;
  hasPdf: boolean;
  clientEmail: string;
  emailConfigured: boolean;
  hasSenderEmail: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"export" | "view" | "send" | "send-html" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const openUrl = (u: string) => {
    setUrl(u);
    window.open(u, "_blank", "noopener,noreferrer");
  };

  const exportPdf = async () => {
    setPending("export");
    setError(null);
    try {
      const res = await fetch(`/api/presupuestos/${presupuestoId}/export`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo exportar el PDF.");
      openUrl(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setPending(null);
    }
  };

  const viewLastPdf = async () => {
    setPending("view");
    setError(null);
    try {
      const u = await getPresupuestoPdfUrl(presupuestoId);
      openUrl(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setPending(null);
    }
  };

  const send = async () => {
    setPending("send");
    setError(null);
    try {
      await sendPresupuesto(presupuestoId);
      setSent(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setPending(null);
    }
  };

  const sendHtml = async () => {
    setPending("send-html");
    setError(null);
    try {
      await sendPresupuestoHtml(presupuestoId);
      setSent(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 816 }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="button" onClick={exportPdf} disabled={pending !== null} style={buttonStyle}>
          {pending === "export" ? "Generando..." : "Exportar PDF"}
        </button>
        {hasPdf && (
          <button type="button" onClick={viewLastPdf} disabled={pending !== null} style={secondaryButtonStyle}>
            {pending === "view" ? "Abriendo..." : "Ver último PDF"}
          </button>
        )}
        {emailConfigured ? (
          <>
            <button type="button" onClick={send} disabled={pending !== null} style={accentButtonStyle}>
              {pending === "send" ? "Enviando..." : `Enviar a ${clientEmail}`}
            </button>
            <button type="button" onClick={sendHtml} disabled={pending !== null} style={secondaryButtonStyle}>
              {pending === "send-html" ? "Enviando..." : "Enviar con diseño (HTML)"}
            </button>
          </>
        ) : hasSenderEmail ? (
          <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)", alignSelf: "center" }}>
            Envío por correo no configurado todavía.
          </span>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)", alignSelf: "center" }}>
            Falta configurar tu{" "}
            <Link href="/cuenta" style={{ color: "var(--accent)", fontWeight: 600 }}>
              correo remitente
            </Link>
            .
          </span>
        )}
      </div>
      {sent && <p style={{ color: "var(--accent)", fontSize: "0.85rem" }}>Enviado a {clientEmail}.</p>}
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: "0.85rem" }}>
          Abrir PDF en una pestaña nueva
        </a>
      )}
    </div>
  );
}
