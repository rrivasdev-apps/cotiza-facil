"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import type { DataType, PresupuestoData } from "@/lib/types";

async function requireAccount() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  return { supabase, account };
}

export async function createPresupuesto(_prevState: string | null, formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  const clientName = String(formData.get("client_name") ?? "").trim();
  const clientEmail = String(formData.get("client_email") ?? "").trim();

  if (!templateId) return "Elegí una plantilla.";
  if (!clientName) return "El nombre del cliente es obligatorio.";
  if (!clientEmail) return "El correo del cliente es obligatorio.";

  const { supabase, account } = await requireAccount();

  const { data: sections, error: sectionsError } = await supabase
    .from("template_sections")
    .select("id")
    .eq("template_id", templateId);
  if (sectionsError) return `No se pudo leer la plantilla: ${sectionsError.message}`;

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: sectionFields, error: fieldsError } = await supabase
    .from("template_section_fields")
    .select("field_catalog_id, required, field:field_catalog(data_type)")
    .in("section_id", sectionIds.length > 0 ? sectionIds : ["00000000-0000-0000-0000-000000000000"]);
  if (fieldsError) return `No se pudo leer los campos de la plantilla: ${fieldsError.message}`;

  const data: PresupuestoData = {};
  for (const sf of sectionFields ?? []) {
    const dataType = (sf.field as unknown as { data_type: DataType } | null)?.data_type;
    const raw = formData.get(`field_${sf.field_catalog_id}`);
    const rawStr = raw == null ? "" : String(raw);

    if (dataType === "lista") {
      const items = rawStr
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (sf.required && items.length === 0) return "Falta completar un campo obligatorio.";
      data[sf.field_catalog_id] = items;
    } else {
      const value = rawStr.trim();
      if (sf.required && !value) return "Falta completar un campo obligatorio.";
      data[sf.field_catalog_id] = value;
    }
  }

  const { data: presupuesto, error } = await supabase
    .from("presupuestos")
    .insert({
      account_id: account.accountId,
      template_id: templateId,
      client_name: clientName,
      client_email: clientEmail,
      data,
    })
    .select("id")
    .single();

  if (error) return `No se pudo crear el presupuesto: ${error.message}`;

  redirect(`/presupuestos/${presupuesto.id}`);
}
