import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con service role — bypasea RLS. Solo para usar server-side
// (route handlers, server actions) después de haber verificado el
// acceso vía una lectura normal con RLS. Nunca importar desde un
// componente cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
