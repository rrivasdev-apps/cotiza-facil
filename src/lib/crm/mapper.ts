import type { Currency, Presupuesto, PresupuestoStatus } from "@/lib/types";

// Mapeo de columnas Cotiza Fácil -> payload que espera CRM Fácil (ver
// SPEC-integracion-cotiza-facil.md §4). Notas sobre el esquema real:
// - presupuestos.status ya usa los mismos 4 valores exactos que pide
//   el payload (borrador/enviado/aprobado/rechazado) — no hace falta
//   traducir, pero el switch exhaustivo de abajo evita que un 5º
//   estado futuro se mande sin querer como si fuera uno de estos 4.
// - client_name/client_email/client_phone/client_address ya están
//   denormalizados en la propia fila de presupuestos (la "foto" del
//   cliente al momento del documento) — no hace falta join con
//   clientes.
// - No existe un concepto de moneda por presupuesto, así que viene de
//   accounts.currency (una moneda por cuenta).
// - clientId (presupuestos.client_id) deja que CRM Fácil reconozca al
//   mismo cliente aunque cambie de email o no tenga ninguno.
// - accountId/accountName identifican el workspace que envía: CRM Fácil
//   conecta su cuenta con el primer workspace que le escribe y rechaza
//   los envíos de cualquier otro con el mismo secreto.
export type CrmQuotePayload = {
  externalId: string;
  number: string;
  title: string;
  total: number;
  currency: Currency;
  status: "borrador" | "enviado" | "aprobado" | "rechazado";
  createdAt: string;
  updatedAt: string;
  url: string;
  accountId: string;
  accountName?: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  sentAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
};

function mapStatus(status: PresupuestoStatus): CrmQuotePayload["status"] {
  switch (status) {
    case "borrador":
    case "enviado":
    case "aprobado":
    case "rechazado":
      return status;
    default: {
      const _exhaustive: never = status;
      throw new Error(`Estado de presupuesto sin mapeo al CRM: ${_exhaustive}`);
    }
  }
}

// Normaliza el teléfono a E.164 solo cuando es inequívoco (10 dígitos
// venezolanos sin prefijo) — en cualquier otro caso lo manda tal cual
// en vez de arriesgar un prefijo incorrecto.
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s-]/g, "");
  if (/^0\d{9}$/.test(digits)) return `+58${digits.slice(1)}`;
  return digits;
}

export function buildQuotePayload(
  presupuesto: Presupuesto,
  account: { currency: Currency; name?: string | null },
): CrmQuotePayload {
  const payload: CrmQuotePayload = {
    externalId: presupuesto.id,
    number: presupuesto.number != null ? `COT-${String(presupuesto.number).padStart(4, "0")}` : presupuesto.id,
    title: `Presupuesto ${presupuesto.client_name}`,
    total: presupuesto.total_amount ?? 0,
    currency: account.currency,
    status: mapStatus(presupuesto.status),
    createdAt: presupuesto.created_at,
    updatedAt: presupuesto.updated_at,
    url: `${process.env.APP_URL}/aprobar/${presupuesto.id}`,
    accountId: presupuesto.account_id,
  };

  if (account.name) payload.accountName = account.name;
  if (presupuesto.client_id) payload.clientId = presupuesto.client_id;
  if (presupuesto.client_name) payload.clientName = presupuesto.client_name;
  if (presupuesto.client_email) payload.clientEmail = presupuesto.client_email;
  if (presupuesto.client_phone) payload.clientPhone = normalizePhone(presupuesto.client_phone);
  if (presupuesto.sent_at) payload.sentAt = presupuesto.sent_at;
  if (presupuesto.approved_at) payload.approvedAt = presupuesto.approved_at;
  if (presupuesto.rejected_at) payload.rejectedAt = presupuesto.rejected_at;

  return payload;
}
