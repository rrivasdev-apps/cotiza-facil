import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { CuentaForm } from "./cuenta-form";

export default async function CuentaPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Cuenta</h1>
      <CuentaForm name={account?.accountName ?? ""} senderEmail={account?.senderEmail ?? ""} />
    </div>
  );
}
