import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { listAccountPlans, listGuayboEvents, listSupportAccounts } from "@/lib/support/actions";
import { SoporteList } from "./soporte-list";
import { PlanesCuentas } from "./planes-cuentas";
import { GuayboEventos } from "./guaybo-eventos";

export default async function SoportePage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account?.isPlatformAdmin) notFound();

  const [accounts, plans, guayboEvents] = await Promise.all([listSupportAccounts(), listAccountPlans(), listGuayboEvents()]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Soporte</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
          Cuentas que activaron el acceso de soporte — solo aparecen acá mientras el acceso sigue vigente.
        </p>
      </div>
      <SoporteList accounts={accounts} />
      <PlanesCuentas rows={plans} />
      <GuayboEventos rows={guayboEvents} />
    </div>
  );
}
