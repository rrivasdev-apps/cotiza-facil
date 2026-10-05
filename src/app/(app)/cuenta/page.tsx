import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { CuentaForm } from "./cuenta-form";
import { SupportAccessToggle } from "./support-access-toggle";
import { HelpButton } from "@/components/help-button";

const HELP_STEPS = [
  "\"Nombre de la cuenta\" es el nombre de tu negocio — aparece en tus presupuestos.",
  "\"Correo remitente\" es la dirección desde la que se envían tus presupuestos por correo a tus clientes.",
  "Ese correo necesita un dominio verificado para poder enviar — si todavía no lo configuraste, el botón \"Enviar por correo\" va a estar apagado.",
  "Toca \"Guardar\" para quedarte con los cambios.",
  "\"Acceso de soporte\" le permite al equipo de Cotiza Fácil entrar a tu cuenta para ayudarte — solo mientras tú lo tengas activado, y se apaga solo a las 48 horas.",
];

export default async function CuentaPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  let supportAccessUntil: string | null = null;
  if (account) {
    const { data } = await supabase.from("accounts").select("support_access_until").eq("id", account.accountId).single();
    supportAccessUntil = data?.support_access_until ?? null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Cuenta</h1>
        <HelpButton title="Cómo usar Cuenta" steps={HELP_STEPS} />
      </div>
      <CuentaForm name={account?.accountName ?? ""} senderEmail={account?.senderEmail ?? ""} />
      <SupportAccessToggle supportAccessUntil={supportAccessUntil} />
    </div>
  );
}
