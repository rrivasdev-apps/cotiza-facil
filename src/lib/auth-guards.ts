import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";

// Guarda para páginas que solo el propietario del workspace puede ver
// (Plantillas, Catálogo, Cuenta). Se llama al inicio de cada page.tsx y
// no desde un layout: los layouts no se vuelven a evaluar al navegar
// entre páginas hermanas, así que no sirven como frontera de acceso.
export async function requireOwnerPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) redirect("/elegir-workspace");
  if (!account.isOwner) redirect("/inicio");
  return account;
}
