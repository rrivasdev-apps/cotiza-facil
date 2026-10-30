import type { SupabaseClient } from "@supabase/supabase-js";

export const DELETION_GRACE_DAYS = 7;

// Ambos buckets guardan todo bajo "<account_id>/" (ver uploadLogo y
// generateAndStorePresupuestoPdf). "logos" también tiene gallery-assets/,
// que no es de ninguna cuenta y por eso no se toca.
const STORAGE_BUCKETS = ["logos", "presupuestos-pdf"];
const LIST_PAGE_SIZE = 100;

// Se vacía el prefijo por tandas: como cada tanda se borra, la siguiente
// lista vuelve a empezar desde 0 y no hace falta paginar con offset.
async function removeAccountFiles(admin: SupabaseClient, accountId: string) {
  for (const bucket of STORAGE_BUCKETS) {
    for (;;) {
      const { data: files, error: listError } = await admin.storage.from(bucket).list(accountId, { limit: LIST_PAGE_SIZE });
      if (listError) throw new Error(`No se pudo listar ${bucket}: ${listError.message}`);
      if (!files || files.length === 0) break;

      const { error: removeError } = await admin.storage
        .from(bucket)
        .remove(files.map((file) => `${accountId}/${file.name}`));
      // Sin esta salida, un borrado que falla repetiría la misma lista para siempre.
      if (removeError) throw new Error(`No se pudo borrar en ${bucket}: ${removeError.message}`);
    }
  }
}

// Qué pasa con cada persona vinculada a la cuenta: la fila de users del
// propietario cuelga de la cuenta (on delete cascade), así que borrar la
// cuenta sin más arrastraría también sus membresías en OTROS espacios.
//  - Sin ningún otro espacio: se elimina su usuario completo.
//  - Con otros espacios: se conserva y solo se desvincula de esta cuenta.
// Los colaboradores no se tocan: su membresía cae sola con la cuenta.
async function resolveHomeUsers(admin: SupabaseClient, accountId: string) {
  const { data: owners, error: ownersError } = await admin
    .from("account_members")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("role", "owner");
  if (ownersError) throw new Error(`No se pudo leer los propietarios: ${ownersError.message}`);

  const { data: homeUsers, error: homeError } = await admin.from("users").select("id").eq("account_id", accountId);
  if (homeError) throw new Error(`No se pudo leer los usuarios: ${homeError.message}`);

  const userIds = new Set([...(owners ?? []).map((row) => row.user_id as string), ...(homeUsers ?? []).map((row) => row.id as string)]);

  for (const userId of userIds) {
    const { count, error: countError } = await admin
      .from("account_members")
      .select("account_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("account_id", accountId);
    if (countError) throw new Error(`No se pudo leer las membresías: ${countError.message}`);

    if ((count ?? 0) === 0) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(`No se pudo eliminar el usuario: ${error.message}`);
    } else {
      const { error } = await admin.from("users").update({ account_id: null }).eq("id", userId).eq("account_id", accountId);
      if (error) throw new Error(`No se pudo desvincular al usuario: ${error.message}`);
    }
  }
}

// Orden pensado para poder reintentar: los archivos primero (si la base de
// datos fallara después, quedarían huérfanos y nadie los volvería a buscar),
// la cuenta al final (mientras exista sigue marcada y el cron la retoma).
export async function purgeAccount(admin: SupabaseClient, accountId: string): Promise<boolean> {
  const { data: account, error } = await admin.from("accounts").select("deletion_requested_at").eq("id", accountId).single();
  if (error) throw new Error(`No se pudo leer la cuenta: ${error.message}`);

  // Se revalida acá y no solo en quien llama: el propietario pudo cancelar
  // entre que se listó la cuenta y este punto.
  const dueBefore = Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
  if (!account.deletion_requested_at || new Date(account.deletion_requested_at).getTime() > dueBefore) return false;

  await removeAccountFiles(admin, accountId);
  await resolveHomeUsers(admin, accountId);

  const { error: deleteError } = await admin.from("accounts").delete().eq("id", accountId);
  if (deleteError) throw new Error(`No se pudo borrar la cuenta: ${deleteError.message}`);
  return true;
}
