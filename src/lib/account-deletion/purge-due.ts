import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { DELETION_GRACE_DAYS, purgeAccount } from "./purge";

export async function purgeDueAccounts(): Promise<{ purged: number; failed: number }> {
  const admin = createAdminClient();
  const dueBefore = new Date(Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: due, error } = await admin
    .from("accounts")
    .select("id")
    .not("deletion_requested_at", "is", null)
    .lte("deletion_requested_at", dueBefore);
  if (error) throw new Error(error.message);

  let purged = 0;
  let failed = 0;
  for (const { id } of due ?? []) {
    try {
      if (await purgeAccount(admin, id)) purged++;
    } catch (error) {
      // Una cuenta que falla no frena a las demás. Se avisa a Sentry porque
      // es una eliminación prometida que no se cumplió: reintenta mañana,
      // pero alguien tiene que enterarse si se repite.
      failed++;
      console.error(`Falló la eliminación de la cuenta ${id}:`, error);
      Sentry.captureException(error);
    }
  }
  return { purged, failed };
}
