import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import type { Template, TemplateShare } from "@/lib/types";
import { NewTemplateForm } from "./new-template-form";
import { duplicateTemplate, setDefaultTemplate } from "@/lib/templates/actions";
import { DeleteTemplateButton } from "./delete-template-button";
import { IncomingShares, SentShares, ShareTemplateButton } from "./template-shares";
import { TemplatesOnboarding } from "./onboarding";

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Plantillas</h1>
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

      <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none" }}>
        {((templates ?? []) as Template[]).map((template) => (
          <li
            key={template.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--card)",
              borderRadius: 12,
              boxShadow: "var(--sh-soft)",
            }}
          >
            <Link
              href={`/plantillas/${template.id}`}
              style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem 1.25rem" }}
            >
              <span style={{ fontWeight: 600 }}>{template.name}</span>
              {template.id === account?.defaultTemplateId && (
                <span
                  title="Esta es la plantilla que se precarga al crear un presupuesto nuevo"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    borderRadius: 999,
                    padding: "0.2rem 0.6rem",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  ★ Predeterminada
                </span>
              )}
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingRight: "1rem" }}>
              {template.id !== account?.defaultTemplateId && (
                <form action={setDefaultTemplate.bind(null, template.id)}>
                  <button
                    type="submit"
                    title="Precargarla al crear un presupuesto nuevo"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--ink-dim)",
                      color: "var(--ink-dim)",
                      borderRadius: 8,
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Marcar como predeterminada
                  </button>
                </form>
              )}
              <form action={duplicateTemplate.bind(null, template.id)}>
                <button
                  type="submit"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--ink-dim)",
                    color: "var(--ink-dim)",
                    borderRadius: 8,
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Duplicar
                </button>
              </form>
              <ShareTemplateButton templateId={template.id} />
              <DeleteTemplateButton templateId={template.id} templateName={template.name} />
            </div>
          </li>
        ))}
        {templates?.length === 0 && (
          <p style={{ color: "var(--ink-dim)" }}>Todavía no hay plantillas.</p>
        )}
      </ul>

      <SentShares shares={(sentShares ?? []) as TemplateShare[]} />
    </div>
  );
}
