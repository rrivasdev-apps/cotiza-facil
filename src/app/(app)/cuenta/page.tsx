import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { requireOwnerPage } from "@/lib/auth-guards";
import { CuentaForm } from "./cuenta-form";
import { SupportAccessToggle } from "./support-access-toggle";
import { ThemeToggle } from "./theme-toggle";
import { IntegracionCrmCard } from "./integracion-crm-card";
import { ColaboradoresCard } from "./colaboradores-card";
import { ExportarDatosCard } from "./exportar-datos-card";
import { EliminarCuentaCard } from "./eliminar-cuenta-card";
import { PlanCard } from "./plan-card";
import { getPlanUsage } from "@/lib/plan-usage";
import { getCollaboratorsOverview } from "@/lib/colaboradores/actions";
import { HelpButton } from "@/components/help-button";
import { getCrmIntegration } from "@/lib/crm/actions";

const HELP_STEPS = [
  "\"Nombre de la cuenta\" es el nombre de tu negocio — aparece en tus presupuestos.",
  "\"Correo remitente\" es la dirección desde la que se envían tus presupuestos por correo a tus clientes.",
  "Ese correo necesita un dominio verificado para poder enviar — si todavía no lo configuraste, el botón \"Enviar por correo\" va a estar apagado.",
  "Toca \"Guardar\" para quedarte con los cambios.",
  "\"Acceso de soporte\" le permite al equipo de Cotiza Fácil entrar a tu cuenta para ayudarte — solo mientras tú lo tengas activado, y se apaga solo a las 48 horas.",
];

export default async function CuentaPage() {
  await requireOwnerPage();
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  let supportAccessUntil: string | null = null;
  let deletionRequestedAt: string | null = null;
  let crmConfig: Awaited<ReturnType<typeof getCrmIntegration>>["config"] = null;
  let crmLog: Awaited<ReturnType<typeof getCrmIntegration>>["log"] = [];
  if (account) {
    const { data } = await supabase
      .from("accounts")
      .select("support_access_until, deletion_requested_at")
      .eq("id", account.accountId)
      .single();
    supportAccessUntil = data?.support_access_until ?? null;
    deletionRequestedAt = data?.deletion_requested_at ?? null;

    const crmIntegration = await getCrmIntegration();
    crmConfig = crmIntegration.config;
    crmLog = crmIntegration.log;
  }

  const collaborators = await getCollaboratorsOverview();
  const planUsage = account ? await getPlanUsage(account.accountId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Cuenta</h1>
        <HelpButton title="Cómo usar Cuenta" steps={HELP_STEPS} />
      </div>
      <CuentaForm
        name={account?.accountName ?? ""}
        senderEmail={account?.senderEmail ?? ""}
        currency={account?.currency ?? "USD"}
      />
      <ThemeToggle />
      <SupportAccessToggle supportAccessUntil={supportAccessUntil} />
      {planUsage && <PlanCard usage={planUsage} />}
      <ColaboradoresCard overview={collaborators} />
      <IntegracionCrmCard config={crmConfig} log={crmLog} />
      <ExportarDatosCard />
      <EliminarCuentaCard accountName={account?.accountName ?? ""} deletionRequestedAt={deletionRequestedAt} />
    </div>
  );
}
