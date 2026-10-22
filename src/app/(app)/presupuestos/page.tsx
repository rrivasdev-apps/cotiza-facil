import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import type { Presupuesto } from "@/lib/types";
import { SparkleIcon } from "@/components/feature-icons";
import { HelpButton } from "@/components/help-button";
import { PresupuestosList } from "./presupuestos-list";

const HELP_STEPS = [
  "Acá ves todos los presupuestos que has hecho, uno debajo del otro.",
  "Toca el botón verde \"Nuevo presupuesto\" para crear uno nuevo.",
  "Toca el nombre de un cliente para abrir ese presupuesto y ver los detalles.",
  "La palabra de color (\"Borrador\", \"Enviado\", \"Aprobado\" o \"Rechazado\") te dice en qué paso va ese presupuesto.",
  "Toca el botón \"⋯\" de una fila para Duplicar ese presupuesto (hacer una copia) o Eliminarlo. Siempre te va a preguntar \"¿estás seguro?\" antes de borrar algo.",
];

export default async function PresupuestosPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  const { data: presupuestos } = await supabase
    .from("presupuestos")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (presupuestos ?? []) as Presupuesto[];

  let defaultTemplateName: string | null = null;
  if (list.length === 0 && account?.defaultTemplateId) {
    const { data: defaultTemplate } = await supabase
      .from("templates")
      .select("name")
      .eq("id", account.defaultTemplateId)
      .maybeSingle();
    defaultTemplateName = defaultTemplate?.name ?? null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.5rem" }}>Presupuestos</h1>
            <HelpButton title="Cómo usar Presupuestos" steps={HELP_STEPS} />
          </div>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
            Gestiona los presupuestos que enviaste a tus clientes.
          </p>
        </div>
        <Link
          href="/presupuestos/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--btn-primary-bg)",
            color: "var(--btn-primary-fg)",
            borderRadius: "var(--radius-md)",
            padding: "0.65rem 1.15rem",
            fontWeight: 700,
            fontSize: "0.875rem",
            boxShadow: "var(--sh-soft)",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Nuevo presupuesto
        </Link>
      </div>

      {list.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "0.75rem",
            background: "var(--card)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-soft)",
            padding: "3rem 1.5rem",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-md)",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SparkleIcon size={26} />
          </div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Crea tu primer presupuesto</h2>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem", maxWidth: 380 }}>
            {defaultTemplateName
              ? <>Ya tienes <strong>&quot;{defaultTemplateName}&quot;</strong> lista — solo falta cargar los datos de un cliente.</>
              : "Ya tienes tu plantilla lista — solo falta cargar los datos de un cliente."}
          </p>
          <Link
            href="/presupuestos/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-fg)",
              borderRadius: "var(--radius-md)",
              padding: "0.65rem 1.25rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              marginTop: "0.5rem",
            }}
          >
            Nuevo presupuesto
          </Link>
        </div>
      ) : (
        <PresupuestosList presupuestos={list} />
      )}
    </div>
  );
}
