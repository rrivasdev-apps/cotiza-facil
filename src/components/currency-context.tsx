"use client";

import { createContext, useContext } from "react";
import type { Currency } from "@/lib/types";

// La moneda es de la cuenta, no de cada pantalla: se pone una vez en el
// layout y los componentes cliente que muestran montos la leen de acá en
// vez de recibirla por props a través de cada formulario.
const CurrencyContext = createContext<Currency>("USD");

export function CurrencyProvider({ currency, children }: { currency: Currency; children: React.ReactNode }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): Currency {
  return useContext(CurrencyContext);
}
