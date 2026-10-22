import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import type { Template, TemplateShare } from "@/lib/types";
import { NewTemplateForm } from "./new-template-form";
import { IncomingShares, SentShares } from "./template-shares";
import { TemplatesList } from "./templates-list";
import { TemplatesOnboarding } from "./onboarding";
import { HelpButton } from "@/components/help-button";

const HELP_STEPS = [
  "Acá ves todas tus plantillas — cada una es un diseño reusable (logo, colores, secciones y campos) que después llenas con los datos de un cliente.",
  "Para crear una desde cero, escribe un nombre arriba y toca \"Nueva plantilla\".",
  "\"Elegir de la galería\" te da diseños ya armados para empezar más rápido.",
  "Toca el nombre de una plantilla para abrirla y editar su Estructura o su Tema.",
  "El botón \"⋯\" de cada plantilla tiene: marcarla como predeterminada (la que se precarga al crear un presupuesto), Duplicar, Compartir (mandársela a otra cuenta por correo) y Eliminar.",
];

export default async function PlantillasPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .order("updated_at", { ascending: false });

  const { data: incomingShares } = account
    ? await supabase
        .from("template_shares")
        .select("*")
        .eq("recipient_account_id", account.accountId)
        .eq("status", "pendiente")
        .order("created_at", { ascending: false })
    : { data: null };

  const { data: sentShares } = account
    ? await supabase
        .from("template_shares")
        .select("*")
        .eq("sender_account_id", account.accountId)
        .order("created_at", { ascending: false })
    : { data: null };

  if ((templates ?? []).length === 0) {
    return (
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <TemplatesOnboarding incomingShares={(incomingShares ?? []) as TemplateShare[]} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Plantillas</h1>
          <HelpButton title="Cómo usar Plantillas" steps={HELP_STEPS} />
        </div>
        <Link
          href="/plantillas/galeria"
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "0.5rem 0.9rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          Elegir de la galería
        </Link>
      </div>

      <IncomingShares shares={(incomingShares ?? []) as TemplateShare[]} />

      <NewTemplateForm />

      <TemplatesList templates={(templates ?? []) as Template[]} defaultTemplateId={account?.defaultTemplateId ?? null} />

      <SentShares shares={(sentShares ?? []) as TemplateShare[]} />
    </div>
  );
}
