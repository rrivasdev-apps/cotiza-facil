"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// A diferencia del resto de las server actions de presupuestos, esta
// la ejecuta el CLIENTE (sin sesión, desde el link del correo) — no
// hay cuenta autenticada que verificar vía RLS, así que usa el
// service role directo. Solo puede tocar status/approved_at, y solo
// si el presupuesto ya estaba "enviado" (evita aprobar un borrador
// por error, o "des-aprobar" un reenvío accidental del link).
type ApproveResult = { error?: string; alreadyApproved?: boolean };

export async function approvePresupuesto(presupuestoId: string): Promise<ApproveResult> {
  try {
    const admin = createAdminClient();

    const { data: presupuesto, error: fetchError } = await admin
      .from("presupuestos")
      .select("status")
      .eq("id", presupuestoId)
      .single();
    if (fetchError || !presupuesto) return { error: "No se encontró el presupuesto." };
    if (presupuesto.status === "aprobado") return { alreadyApproved: true };
    if (presupuesto.status !== "enviado") {
      return { error: "Este presupuesto todavía no fue enviado." };
    }

    const { error } = await admin
      .from("presupuestos")
      .update({ status: "aprobado", approved_at: new Date().toISOString() })
      .eq("id", presupuestoId)
      .eq("status", "enviado");
    if (error) return { error: error.message };

    revalidatePath(`/aprobar/${presupuestoId}`);
    revalidatePath(`/presupuestos/${presupuestoId}`);
    revalidatePath("/presupuestos");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ocurrió un error." };
  }
}
