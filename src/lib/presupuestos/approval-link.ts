import type { PresupuestoStatus } from "@/lib/types";

export const APPROVAL_LINK_TTL_DAYS = 30;

export function newApprovalExpiry(): string {
  return new Date(Date.now() + APPROVAL_LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// Solo corta mientras el cliente todavía tiene que decidir: uno ya
// aprobado o rechazado sigue siendo consultable desde su enlace.
export function isApprovalLinkExpired(status: PresupuestoStatus, expiresAt: string | null): boolean {
  return status === "enviado" && expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();
}

export const APPROVAL_LINK_EXPIRED_MESSAGE =
  "Este enlace venció. Pídele a quien te envió el presupuesto que te mande uno nuevo.";
