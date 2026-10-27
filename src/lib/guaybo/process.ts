import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectivePlan, type Plan } from "@/lib/plans";

// Sin "use server": recibe payloads y ids internos; no debe ser un endpoint.

// Alias del producto en el enlace de pago de Guaybo (productAlias=...).
const PRODUCT_ALIAS = "cotiza-facil";

type PaidPlan = "pionero_mensual" | "pionero_anual";
const PLAN_MONTHS: Record<PaidPlan, number> = { pionero_mensual: 1, pionero_anual: 12 };

type GuayboProduct = {
  alias?: string;
  name?: string;
  plan?: { id?: string; name?: string; price?: number };
  subtotal?: number;
};

// Lo que Guaybo envía de verdad es plano (event, user, purchase, payment
// en la raíz); la documentación lo muestra envuelto en "payload". Se
// aceptan los dos para no depender de cuál sea el definitivo.
type GuayboBody = {
  event?: string;
  user?: { email?: string };
  payment?: { paymentId?: string; status?: string; amount_usd?: number };
  purchase?: { purchaseId?: string; products?: GuayboProduct[]; timestamp?: string; amount_usd?: number };
  timestamp?: string;
};

type GuayboEnvelope = GuayboBody & { payload?: GuayboBody };

// Primero por el nombre del plan en Guaybo ("Mensual"/"Anual"), y si no
// lo reconoce, por el precio publicado ($15 / $100).
export function mapGuayboPlan(planName: string | undefined, price: number | undefined): PaidPlan | null {
  const name = (planName ?? "").toLowerCase();
  if (/anual|annual|year|año/.test(name)) return "pionero_anual";
  if (/mensual|monthly|month|mes/.test(name)) return "pionero_mensual";
  if (price === 100) return "pionero_anual";
  if (price === 15) return "pionero_mensual";
  return null;
}

// ilike trata "_" y "%" como comodines, y "_" es común en correos
// (juan_perez@...): sin escapar, juan_perez coincidiría con juanxperez.
// Se escapan para que la comparación sea exacta (solo sin distinguir
// mayúsculas).
function exactEmailPattern(email: string): string {
  return email.trim().replace(/[\\%_]/g, "\\$&");
}

function addMonths(from: Date, months: number): Date {
  const result = new Date(from);
  const day = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  // 31 ene + 1 mes cae en 3 mar: se corrige al último día del mes anterior.
  if (result.getUTCDate() !== day) result.setUTCDate(0);
  return result;
}

// Clave de idempotencia por compra y plan. Con purchaseId (estable entre
// purchase.created, payment.created y payment.updated) es exacta; sin él,
// se aproxima con comprador + momento de la compra + producto + monto.
function purchaseKey(params: {
  purchaseId?: string;
  email: string;
  timestamp: string;
  alias: string;
  planId?: string;
  planName: string;
  amount: number;
}): string {
  const parts = params.purchaseId
    ? ["id", params.purchaseId, params.planId ?? params.planName]
    : [params.email, params.timestamp, params.alias, params.planName, params.amount];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

// Aplica un plan a una cuenta. Renovar el mismo plan suma desde el
// vencimiento actual (no pierde días); cambiar de plan empieza desde hoy.
// Las cuentas "fundador" no se tocan: pasar a Pioneros y luego vencer las
// dejaría en Gratis, peor que lo que ya tienen.
export async function applyPlanToAccount(accountId: string, plan: PaidPlan): Promise<"applied" | "skipped-fundador"> {
  const admin = createAdminClient();
  const { data: account } = await admin.from("accounts").select("plan, plan_expires_at").eq("id", accountId).single();
  if (!account) throw new Error("Cuenta no encontrada.");
  if (account.plan === "fundador") return "skipped-fundador";

  const current = effectivePlan(account.plan as Plan, account.plan_expires_at as string | null);
  const now = new Date();
  const base =
    current === plan && account.plan_expires_at && new Date(account.plan_expires_at) > now
      ? new Date(account.plan_expires_at)
      : now;

  const { error } = await admin
    .from("accounts")
    .update({ plan, plan_expires_at: addMonths(base, PLAN_MONTHS[plan]).toISOString() })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
  return "applied";
}

async function findOwnedAccountId(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("account_members")
    .select("account_id, users!inner(email)")
    .eq("role", "owner")
    .ilike("users.email", exactEmailPattern(email))
    .limit(1)
    .maybeSingle();
  return (data?.account_id as string | undefined) ?? null;
}

// Devuelve un texto corto con lo que pasó (se guarda en el evento).
export async function processGuayboEvent(eventId: string, envelope: unknown): Promise<string> {
  const data = (envelope ?? {}) as GuayboEnvelope;
  const inner: GuayboBody = data.payload ?? data;
  const email = inner?.user?.email?.trim().toLowerCase();
  const status = inner?.payment?.status;

  const products = (inner?.purchase?.products ?? []).filter((product) => product.alias === PRODUCT_ALIAS);
  if (products.length === 0) return "ignorado: no es el producto cotiza-facil";
  if (!email) return "ignorado: el aviso no trae email del comprador";

  // Con un cupón del 100% el total es $0 y Guaybo no registra ningún pago
  // (no llega objeto "payment" ni eventos payment.*), así que la propia
  // compra es la confirmación. Una compra con monto > 0 y sin pago todavía
  // está pendiente de pagar y NO debe activar nada.
  const fullyDiscounted = !inner.payment && inner.purchase?.amount_usd === 0;
  if (status !== "CONFIRMED" && !fullyDiscounted) {
    return `ignorado: pago ${status ?? "sin estado"} (solo se activa con CONFIRMED)`;
  }

  const admin = createAdminClient();
  const outcomes: string[] = [];

  for (const product of products) {
    const plan = mapGuayboPlan(product.plan?.name, product.plan?.price);
    if (!plan) {
      outcomes.push(`error: plan no reconocido (${product.plan?.name ?? "sin nombre"}, ${product.plan?.price ?? "sin precio"})`);
      continue;
    }

    const timestamp = inner?.purchase?.timestamp ?? inner?.timestamp ?? "";
    const key = purchaseKey({
      purchaseId: inner?.purchase?.purchaseId,
      email,
      timestamp,
      alias: product.alias ?? "",
      planId: product.plan?.id,
      planName: product.plan?.name ?? "",
      amount: product.subtotal ?? product.plan?.price ?? 0,
    });

    const accountId = await findOwnedAccountId(email);

    // El insert con clave única es el "candado": si ya existe, otro aviso
    // de la misma compra ya la procesó.
    const { data: claimed, error: claimError } = await admin
      .from("plan_activations")
      .insert({
        purchase_key: key,
        email,
        plan,
        status: accountId ? "applied" : "pending",
        account_id: accountId,
        webhook_event_id: eventId,
      })
      .select("id")
      .single();
    if (claimError) {
      outcomes.push(claimError.code === "23505" ? "duplicado: esta compra ya se procesó" : `error: ${claimError.message}`);
      continue;
    }

    if (!accountId) {
      outcomes.push(`pendiente: ${email} aún no tiene cuenta propia (${plan})`);
      continue;
    }

    try {
      const result = await applyPlanToAccount(accountId, plan);
      if (result === "skipped-fundador") {
        await admin
          .from("plan_activations")
          .update({ status: "skipped", note: "Cuenta fundador: no se cambió automáticamente." })
          .eq("id", claimed.id);
        outcomes.push(`omitido: la cuenta de ${email} es fundador`);
      } else {
        outcomes.push(`activado: ${plan} para ${email}`);
      }
    } catch (error) {
      // Se libera el candado para que un reintento de Guaybo pueda volver a intentar.
      await admin.from("plan_activations").delete().eq("id", claimed.id);
      outcomes.push(`error: ${error instanceof Error ? error.message : "no se pudo aplicar el plan"}`);
    }
  }

  return outcomes.join(" | ");
}

// Se llama cuando alguien crea su cuenta propia: aplica las compras que
// hizo antes de registrarse (mismo email).
export async function applyPendingActivations(email: string, accountId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("plan_activations")
    .select("id, plan")
    .eq("status", "pending")
    .ilike("email", exactEmailPattern(email))
    .order("created_at");

  for (const activation of pending ?? []) {
    // Candado: solo gana quien logre pasar de pending a applied.
    const { data: won } = await admin
      .from("plan_activations")
      .update({ status: "applied", account_id: accountId })
      .eq("id", activation.id)
      .eq("status", "pending")
      .select("id");
    if (!won?.length) continue;

    try {
      await applyPlanToAccount(accountId, activation.plan as PaidPlan);
    } catch {
      await admin.from("plan_activations").update({ status: "pending", account_id: null }).eq("id", activation.id);
    }
  }
}
