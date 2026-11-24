"use client";

import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import {
  saveWizardBackground,
  saveWizardConditions,
  saveWizardContact,
  saveWizardSigner,
  sendWizardLink,
  uploadWizardLogo,
} from "@/lib/templates/wizard-actions";
import {
  BACKGROUND_CHOICES,
  applyWizardDraft,
  type WizardDraft,
} from "@/lib/templates/wizard";
import type { FieldCatalogEntry, PageWithSections, Template } from "@/lib/types";
import { TemplatePreview } from "../template-preview";

// Pasos del asistente. El paso 1 ("Plantilla") es la galería, que ya
// existe aparte; el asistente arranca en el paso 2 pero la numeración
// cuenta los 6 para que la persona vea el camino completo.
const STEPS = ["Plantilla", "Logo y fondo", "Contacto", "Firma", "Condiciones", "Listo"] as const;
const FIRST_WIZARD_STEP = 1;
const LAST_STEP = STEPS.length - 1;
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
// Debajo de este ancho la hoja no cabe junto al formulario: se sugiere
// (sin obligar) seguir en un computador.
const NARROW_QUERY = "(max-width: 700px)";
const HINT_DISMISSED_KEY = "wizard-computer-hint-dismissed";
const LINK_COOLDOWN_MS = 60_000;

// Ancho de pantalla como estado externo; en el servidor no hay ventana,
// así que arranca "no angosto" y el aviso aparece solo en el cliente.
function useIsNarrow(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(NARROW_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

// Preferencia "ya entendí" guardada en el navegador. localStorage puede
// fallar (ventana privada), así que también se recuerda en memoria.
let hintDismissedInMemory = false;
const hintListeners = new Set<() => void>();

function readHintDismissed(): boolean {
  if (hintDismissedInMemory) return true;
  try {
    return window.localStorage.getItem(HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissHintForever() {
  hintDismissedInMemory = true;
  try {
    window.localStorage.setItem(HINT_DISMISSED_KEY, "1");
  } catch {}
  hintListeners.forEach((notify) => notify());
}

function useHintDismissed(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      hintListeners.add(onChange);
      return () => hintListeners.delete(onChange);
    },
    readHintDismissed,
    () => true,
  );
}

const inputStyle: React.CSSProperties = {
  font: "inherit",
  padding: "0.8rem 0.9rem",
  border: "1.5px solid var(--line-strong)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  width: "100%",
  minWidth: 0,
};

const primaryButton: React.CSSProperties = {
  background: "var(--btn-primary-bg)",
  color: "var(--btn-primary-fg)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "0.85rem 1.4rem",
  fontWeight: 800,
  fontSize: "1rem",
  cursor: "pointer",
  font: "inherit",
};

const quietButton: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ink-dim)",
  font: "inherit",
  cursor: "pointer",
  padding: "0.5rem 0.25rem",
};

function Field({ id, label, children, help }: { id: string; label: string; children: React.ReactNode; help?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label htmlFor={id} style={{ fontWeight: 700, fontSize: "0.9rem" }}>
        {label}
      </label>
      {children}
      {help && <span style={{ color: "var(--ink-faint)", fontSize: "0.8rem" }}>{help}</span>}
    </div>
  );
}

export function Asistente({
  template,
  pages,
  catalog,
  initialDraft,
}: {
  template: Template;
  pages: PageWithSections[];
  catalog: FieldCatalogEntry[];
  initialDraft: WizardDraft;
}) {
  const [step, setStep] = useState(FIRST_WIZARD_STEP);
  const [draft, setDraft] = useState<WizardDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, startSaving] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const narrow = useIsNarrow();
  const hintDismissed = useHintDismissed();
  const [linkState, setLinkState] = useState<"idle" | "sending" | "sent">("idle");
  const [linkError, setLinkError] = useState<string | null>(null);

  const emailMeTheLink = async () => {
    setLinkError(null);
    setLinkState("sending");
    const result = await sendWizardLink(template.id);
    if ("error" in result) {
      setLinkError(result.error);
      setLinkState("idle");
      return;
    }
    setLinkState("sent");
    // Evita reenvíos seguidos: el botón vuelve a estar disponible al minuto.
    setTimeout(() => setLinkState("idle"), LINK_COOLDOWN_MS);
  };

  // Misma lógica que usan las acciones al guardar: lo que se ve acá es
  // lo que va a quedar. useMemo porque TemplatePreview vuelve a pedir
  // la vista previa cada vez que cambian estas referencias.
  const preview = useMemo(() => applyWizardDraft(template, pages, draft), [template, pages, draft]);

  const update = (patch: Partial<WizardDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const goTo = (next: number) => {
    setError(null);
    setStep(Math.min(LAST_STEP, Math.max(FIRST_WIZARD_STEP, next)));
  };

  // Guarda lo del paso actual y avanza. Si falla, se queda en el paso y
  // dice por qué — nunca avanza como si hubiera guardado.
  const saveAndContinue = (skip = false) => {
    setError(null);
    startSaving(async () => {
      try {
        if (!skip) {
          if (step === 1) await saveWizardBackground(template.id, draft.bgColor);
          if (step === 2) await saveWizardContact(template.id, draft.address, draft.email);
          if (step === 3) await saveWizardSigner(template.id, draft.signer, draft.role);
          if (step === 4) {
            const saved = await saveWizardConditions(template.id, draft.conditions);
            update({ conditions: saved });
          }
        }
        goTo(step + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar. Inténtalo de nuevo.");
      }
    });
  };

  const handleLogoChosen = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError("El logo pesa más de 4 MB. Prueba con una imagen más liviana.");
      return;
    }
    setError(null);
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      await uploadWizardLogo(template.id, formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el logo.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // El logo que trae una plantilla de galería es un archivo de ejemplo
  // ("Tu logo aquí") que vive en la carpeta de otra cuenta; solo cuenta
  // como logo propio el que está en la carpeta de esta cuenta.
  const hasOwnLogo = Boolean(template.theme.logoPath?.includes(`/${template.account_id}/`));

  const stepDone = [
    true,
    hasOwnLogo || draft.bgColor !== null,
    Boolean(draft.address || draft.email),
    Boolean(draft.signer),
    draft.conditions.some((c) => c.on && c.text.trim()),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      {narrow && !hintDismissed && (
        <div
          role="note"
          style={{
            background: "var(--accent-soft)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
            fontSize: "0.9rem",
          }}
        >
          <span>
            Puedes hacerlo desde el teléfono. Si prefieres ver la hoja más grande, te enviamos el enlace a tu correo para
            seguir en un computador.
          </span>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={emailMeTheLink}
              disabled={linkState !== "idle"}
              style={{ ...primaryButton, padding: "0.55rem 1rem", fontSize: "0.9rem", opacity: linkState === "idle" ? 1 : 0.7 }}
            >
              {linkState === "sending" ? "Enviando..." : linkState === "sent" ? "Enlace enviado" : "Enviarme el enlace por correo"}
            </button>
            <button type="button" onClick={dismissHintForever} style={{ ...quietButton, textDecoration: "underline", fontSize: "0.85rem" }}>
              Seguir aquí
            </button>
          </div>
          {linkState === "sent" && <span role="status">Revisa tu correo: ahí está el enlace para continuar.</span>}
          {linkError && (
            <span role="alert" style={{ color: "var(--danger)" }}>
              {linkError}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink-dim)" }}>
          <span>
            Paso {step + 1} de {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <div style={{ height: 6, background: "var(--line)", borderRadius: 99, overflow: "hidden" }} role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <div style={{ width: `${((step + 1) / STEPS.length) * 100}%`, height: "100%", background: "var(--accent)", transition: "width .3s" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: "1.25rem", alignItems: "start" }}>
        <section
          style={{
            background: "var(--card)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-soft)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
            minWidth: 0,
          }}
        >
          {step === 1 && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>Sube tu logo</h1>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <input
                  ref={fileInputRef}
                  id="wizard-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => handleLogoChosen(e.target.files?.[0])}
                  style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
                />
                <label
                  htmlFor="wizard-logo"
                  style={{
                    border: "2px dashed var(--line-strong)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1.75rem 1rem",
                    textAlign: "center",
                    cursor: uploadingLogo ? "wait" : "pointer",
                    background: "var(--bg)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                    alignItems: "center",
                  }}
                >
                  {template.theme.logoPath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={template.theme.logoPath} alt="Tu logo" style={{ maxHeight: 64, maxWidth: "70%", objectFit: "contain" }} />
                  )}
                  <b>{uploadingLogo ? "Subiendo..." : template.theme.logoPath ? "Cambiar logo" : "Toca aquí para elegir tu logo"}</b>
                  <span style={{ color: "var(--ink-faint)", fontSize: "0.82rem" }}>PNG, JPG, WebP o SVG, hasta 4 MB. Si no lo tienes a mano, sigue con el paso siguiente.</span>
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Fondo de la hoja</span>
                <span style={{ color: "var(--ink-faint)", fontSize: "0.82rem" }}>Elegir un color liso reemplaza la imagen de fondo del diseño.</span>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }} role="group" aria-label="Color del fondo de la hoja">
                  <button
                    type="button"
                    onClick={() => update({ bgColor: null })}
                    aria-pressed={draft.bgColor === null}
                    style={{
                      ...quietButton,
                      border: `2px solid ${draft.bgColor === null ? "var(--accent)" : "var(--line-strong)"}`,
                      borderRadius: 999,
                      padding: "0.55rem 0.9rem",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    El de la plantilla
                  </button>
                  {BACKGROUND_CHOICES.map((choice) => (
                    <button
                      key={choice.bg}
                      type="button"
                      onClick={() => update({ bgColor: choice.bg })}
                      aria-label={choice.label}
                      aria-pressed={draft.bgColor === choice.bg}
                      title={choice.label}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: choice.bg,
                        cursor: "pointer",
                        border: `2px solid ${draft.bgColor === choice.bg ? "var(--accent)" : "var(--line-strong)"}`,
                        boxShadow: draft.bgColor === choice.bg ? "0 0 0 3px var(--accent-soft)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>¿Dónde te encuentran tus clientes?</h1>
              <p style={{ color: "var(--ink-dim)" }}>Esto sale al pie de cada presupuesto.</p>
              <Field id="wizard-address" label="Dirección">
                <input id="wizard-address" style={inputStyle} autoComplete="street-address" placeholder="Av. Principal 123, Caracas" value={draft.address} onChange={(e) => update({ address: e.target.value })} />
              </Field>
              <Field id="wizard-email" label="Correo">
                <input id="wizard-email" type="email" style={inputStyle} autoComplete="email" placeholder="hola@tunegocio.com" value={draft.email} onChange={(e) => update({ email: e.target.value })} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>¿Quién firma el presupuesto?</h1>
              <Field id="wizard-signer" label="Nombre">
                <input id="wizard-signer" style={inputStyle} autoComplete="name" placeholder="María Pérez" value={draft.signer} onChange={(e) => update({ signer: e.target.value })} />
              </Field>
              <Field id="wizard-role" label="Cargo" help="Opcional.">
                <input id="wizard-role" style={inputStyle} placeholder="Directora comercial" value={draft.role} onChange={(e) => update({ role: e.target.value })} />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>Revisa tus condiciones</h1>
              <p style={{ color: "var(--ink-dim)" }}>Apaga las que no apliquen o corrige el texto.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {draft.conditions.length === 0 && <p style={{ color: "var(--ink-faint)" }}>Esta plantilla no trae condiciones. Agrega la primera.</p>}
                {draft.conditions.map((condition, index) => (
                  <div key={condition.id ?? `new-${index}`} style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      aria-label={`Incluir condición ${index + 1}`}
                      checked={condition.on}
                      onChange={(e) => update({ conditions: draft.conditions.map((c, i) => (i === index ? { ...c, on: e.target.checked } : c)) })}
                      style={{ width: 22, height: 22, accentColor: "var(--accent)", flex: "none" }}
                    />
                    <input
                      aria-label={`Texto de la condición ${index + 1}`}
                      style={inputStyle}
                      value={condition.text}
                      maxLength={300}
                      onChange={(e) => update({ conditions: draft.conditions.map((c, i) => (i === index ? { ...c, text: e.target.value } : c)) })}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => update({ conditions: [...draft.conditions, { id: null, text: "", on: true }] })}
                style={{ ...quietButton, border: "1.5px dashed var(--line-strong)", borderRadius: "var(--radius-md)", padding: "0.7rem", fontWeight: 700 }}
              >
                + Agregar otra condición
              </button>
            </>
          )}

          {step === 5 && (
            <>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>¡Listo! Tu plantilla está armada</h1>
              <p style={{ color: "var(--ink-dim)" }}>Lo pendiente lo puedes completar cuando quieras.</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {STEPS.slice(0, 5).map((name, index) => (
                  <li key={name} style={{ display: "flex", gap: "0.6rem", alignItems: "center", background: "var(--bg)", padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)" }}>
                    <span
                      aria-hidden
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        background: stepDone[index] ? "var(--accent)" : "var(--line-strong)",
                        color: stepDone[index] ? "#fff" : "var(--ink-dim)",
                      }}
                    >
                      {stepDone[index] ? "✓" : "–"}
                    </span>
                    {name}
                    <small style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>{stepDone[index] ? "Hecho" : "Pendiente"}</small>
                  </li>
                ))}
              </ul>
            </>
          )}

          {error && (
            <p role="alert" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            {step > FIRST_WIZARD_STEP && (
              <button type="button" style={quietButton} onClick={() => goTo(step - 1)} disabled={saving}>
                ← Atrás
              </button>
            )}
            <span style={{ flex: 1 }} />
            {step < LAST_STEP ? (
              <>
                <button type="button" style={{ ...quietButton, textDecoration: "underline", fontSize: "0.88rem" }} onClick={() => saveAndContinue(true)} disabled={saving}>
                  Lo hago después
                </button>
                <button type="button" style={{ ...primaryButton, opacity: saving ? 0.7 : 1 }} onClick={() => saveAndContinue()} disabled={saving || uploadingLogo}>
                  {saving ? "Guardando..." : "Continuar"}
                </button>
              </>
            ) : (
              <Link href="/presupuestos/new" style={{ ...primaryButton, textDecoration: "none" }}>
                Crear mi primer presupuesto
              </Link>
            )}
          </div>
          {step === LAST_STEP && (
            <Link href={`/plantillas/${template.id}`} style={{ color: "var(--ink-dim)", fontSize: "0.88rem" }}>
              Ajustar más detalles en el editor
            </Link>
          )}
        </section>

        <div style={{ minWidth: 0 }}>
          <TemplatePreview template={preview.template} pages={preview.pages} catalog={catalog} />
        </div>
      </div>
    </div>
  );
}
