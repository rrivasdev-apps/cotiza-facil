import type { PresupuestoItem } from "@/lib/types";

export function lineTotal(item: PresupuestoItem): number {
  const cantidad = Number(item.cantidad);
  const precio = Number(item.precioUnitario);
  if (!Number.isFinite(cantidad) || !Number.isFinite(precio)) return 0;
  return cantidad * precio;
}

export function grandTotal(items: PresupuestoItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

// Mismo formato $ que el resto de los valores moneda de la app
// (formatFieldValue/formatValue/formatFieldPlain).
export function formatMoney(n: number): string {
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function formatQuantity(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? n.toLocaleString("es-AR") : raw;
}
