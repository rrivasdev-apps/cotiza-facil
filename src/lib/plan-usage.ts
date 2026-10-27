import { createAdminClient } from "@/lib/supabase/admin";
import { FREE_LIMITS, collaboratorLimit, effectivePlan, type Plan } from "@/lib/plans";

// Sin "use server": recibe un accountId, no debe ser un endpoint. El admin
// client cuenta filas sin pasar por RLS (un colaborador también las vería,
// pero así el conteo no depende del rol).
export async function getPlanUsage(accountId: string) {
  const admin = createAdminClient();
  const [{ data: account }, { count: templates }, { count: presupuestos }, { count: collaborators }] = await Promise.all([
    admin.from("accounts").select("plan, plan_expires_at, max_collaborators").eq("id", accountId).single(),
    admin.from("templates").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    admin.from("presupuestos").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    admin
      .from("account_members")
      .select("user_id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("role", "collaborator"),
  ]);

  const plan = (account?.plan as Plan | undefined) ?? "gratis";
  const expiresAt = (account?.plan_expires_at as string | null | undefined) ?? null;
  const effective = effectivePlan(plan, expiresAt);
  const isFree = effective === "gratis";

  return {
    plan,
    expiresAt,
    effective,
    expired: effective !== plan,
    templates: templates ?? 0,
    presupuestos: presupuestos ?? 0,
    collaborators: collaborators ?? 0,
    collaboratorLimit: collaboratorLimit(plan, expiresAt, (account?.max_collaborators as number | undefined) ?? 0),
    templatesAtLimit: isFree && (templates ?? 0) >= FREE_LIMITS.templates,
    presupuestosAtLimit: isFree && (presupuestos ?? 0) >= FREE_LIMITS.presupuestos,
  };
}

export const TEMPLATE_LIMIT_MESSAGE = "Tu plan Gratis incluye 1 plantilla. Mejora a Pioneros para crear más.";
export const PRESUPUESTO_LIMIT_MESSAGE = "Tu plan Gratis incluye 5 presupuestos. Mejora a Pioneros para crear más.";
