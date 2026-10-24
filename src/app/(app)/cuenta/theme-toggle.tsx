"use client";

import { useSyncExternalStore } from "react";

type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const CHANGE_EVENT = "theme-change";

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function applyChoice(choice: ThemeChoice) {
  // "Automático" quita el atributo para que mande prefers-color-scheme
  // (ver design-tokens.css). El script de app/layout.tsx hace lo mismo
  // antes del primer pintado, para que no parpadee.
  if (choice === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", choice);
  try {
    if (choice === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Sin storage (modo privado): el tema aplica solo en esta visita.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 12,
        boxShadow: "var(--sh-soft)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Apariencia</div>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.82rem", margin: 0 }}>
          Elige el modo claro u oscuro. &quot;Automático&quot; sigue la configuración de tu dispositivo. Se guarda en este
          navegador.
        </p>
      </div>
      <div role="radiogroup" aria-label="Apariencia" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {OPTIONS.map((option) => {
          const selected = choice === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => applyChoice(option.value)}
              style={{
                background: selected ? "var(--btn-primary-bg)" : "transparent",
                color: selected ? "var(--btn-primary-fg)" : "var(--ink)",
                border: selected ? "1px solid transparent" : "1px solid var(--line-strong)",
                borderRadius: 8,
                padding: "0.5rem 1.1rem",
                font: "inherit",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
