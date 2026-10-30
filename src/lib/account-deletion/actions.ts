"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAccount } from "@/lib/account";
import { sendAccountDeletionEmail, isEmailConfigured } from "@/lib/email/resend";
import { getAppUrl } from "@/lib/app-url";
import { DELETION_GRACE_DAYS } from "./purge";

type Result = { error: string } | { error?: undefined };

async function requireOwner() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) throw new Error("No autenticado.");
  if (!account.isOwner) throw new Error("Solo el propietario del workspace puede hacer esto.");
  return account;
}

// Los errores se devuelven como { error } y no se lanzan: Next redacta las
// excepciones de las server actions en producción y el usuario vería un
// mensaje genérico (mismo criterio que sendPresupuesto).
export async function requestAccountDeletion(confirmName: string): Promise<Result> {
  try {
    const account = await requireOwner();

    // Escribir el nombre del negocio evita que un clic accidental programe
    // el borrado de todo un workspace.
    if (confirmName.trim().toLowerCase() !== account.accountName.trim().toLowerCase()) {
      return { error: "El nombre no coincide. Escribe el nombre exacto de tu negocio." };
    }

    // La escritura va por admin porque el propietario no tiene policy de
    // update sobre accounts; el permiso ya se verificó arriba.
    const admin = createAdminClient();
    const requestedAt = new Date();
    const { error } = await admin
      .from("accounts")
      .update({ deletion_requested_at: requestedAt.toISOString() })
      .eq("id", account.accountId)
      .is("deletion_requested_at", null);
    if (error) return { error: "No se pudo programar la eliminación. Intenta de nuevo." };

    // El aviso por correo es la red de seguridad: si alguien más programó el
    // borrado con tu sesión, es la forma de enterarte a tiempo. Si falla, la
    // solicitud sigue en pie y se ve en Cuenta.
    if (isEmailConfigured(account.senderEmail)) {
      const deleteOn = new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
      try {
        await sendAccountDeletionEmail(
          account.userEmail,
          account.accountName,
          deleteOn.toLocaleDateString("es-VE", { dateStyle: "long", timeZone: "America/Caracas" }),
          `${getAppUrl()}/cuenta`,
          account.senderEmail,
        );
      } catch (emailError) {
        console.error("No se pudo enviar el aviso de eliminación:", emailError);
      }
    }

    revalidatePath("/cuenta");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ocurrió un error." };
  }
}

export async function cancelAccountDeletion(): Promise<Result> {
  try {
    const account = await requireOwner();
    const admin = createAdminClient();
    const { error } = await admin.from("accounts").update({ deletion_requested_at: null }).eq("id", account.accountId);
    if (error) return { error: "No se pudo cancelar. Intenta de nuevo." };
    revalidatePath("/cuenta");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ocurrió un error." };
  }
}
