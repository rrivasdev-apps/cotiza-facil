"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CURRENCIES } from "@/lib/types";
import type { Currency } from "@/lib/types";

const selectStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.45rem 0.6rem",
  font: "inherit",
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "var(--ink)",
  boxShadow: "var(--sh-soft)",
};

// Selector controlado. Muestra solo el código (USD, VES…) para que quepa
// en un encabezado; el nombre completo queda en el tooltip de cada opción.
export function CurrencySelect({ value, onChange }: { value: Currency; onChange: (next: Currency) => void }) {
  return (
    <select
      aria-label="Moneda"
      title="Moneda de los presupuestos que se muestran"
      value={value}
      onChange={(event) => onChange(event.target.value as Currency)}
      style={selectStyle}
    >
      {CURRENCIES.map((currency) => (
        <option key={currency.value} value={currency.value} title={currency.label}>
          {currency.value}
        </option>
      ))}
    </select>
  );
}

// Para páginas de servidor: la moneda vive en ?moneda= (así el filtro
// sobrevive a recargar y a compartir el enlace) y se conserva el resto de
// parámetros, como el período del inicio.
export function CurrencyParamSelect({ value }: { value: Currency }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <CurrencySelect
      value={value}
      onChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("moneda", next);
        router.replace(`${pathname}?${params.toString()}`);
      }}
    />
  );
}
