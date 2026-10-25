import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { listCollaboratorLimits, listSupportAccounts } from "@/lib/support/actions";
import { SoporteList } from "./soporte-list";
import { LimitesColaboradores } from "./limites-colaboradores";

export default async function SoportePage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account?.isPlatformAdmin) notFound();

  const [accounts, limits] = await Promise.all([listSupportAccounts(), listCollaboratorLimits()]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 640, margin: "0 auto" }}>
      <div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Soporte</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
          Cuentas que activaron el acceso de soporte — solo aparecen acá mientras el acceso sigue vigente.
        </p>
      </div>
      <SoporteList accounts={accounts} />
      <LimitesColaboradores rows={limits} />
    </div>
  );
}
