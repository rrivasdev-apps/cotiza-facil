// Planes de cuenta. Los topes de plantillas y presupuestos del plan Gratis
// se hacen cumplir en la base (triggers de 20261027000000_account_plans.sql);
// estos valores deben coincidir con los de esos triggers. Los colaboradores
// se controlan en la app (ver getSeatUsage).
export type Plan = "gratis" | "pionero_mensual" | "pionero_anual" | "fundador";

export const PLAN_LABELS: Record<Plan, string> = {
  gratis: "Gratis",
  pionero_mensual: "Pioneros mensual",
  pionero_anual: "Pioneros anual",
  fundador: "Fundador",
};

export const FREE_LIMITS = { templates: 1, presupuestos: 5 } as const;

const PAID_PLANS: Plan[] = ["pionero_mensual", "pionero_anual"];

// Un plan de pago vencido se comporta como Gratis (sin borrar nada).
// plan_expires_at null = sin vencimiento.
export function effectivePlan(plan: Plan, expiresAt: string | null): Plan {
  if (PAID_PLANS.includes(plan) && expiresAt && new Date(expiresAt) < new Date()) return "gratis";
  return plan;
}

// "fundador" (cuentas anteriores a los planes) conserva el tope editable
// de accounts.max_collaborators; el resto sale del plan.
export function collaboratorLimit(plan: Plan, expiresAt: string | null, maxCollaboratorsColumn: number): number {
  switch (effectivePlan(plan, expiresAt)) {
    case "gratis":
      return 0;
    case "pionero_mensual":
      return 1;
    case "pionero_anual":
      return 5;
    case "fundador":
      return maxCollaboratorsColumn;
  }
}
