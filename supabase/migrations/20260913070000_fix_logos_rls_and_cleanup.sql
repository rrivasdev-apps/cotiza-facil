-- Causa raíz encontrada en diagnóstico: storage.buckets tiene RLS
-- activado pero no tenía ninguna policy. El propio Storage API necesita
-- leer la fila del bucket al subir un objeto; sin una policy de select
-- esa lectura queda denegada por RLS, y eso se reporta como el mismo
-- error genérico "new row violates row-level security policy" en el
-- insert de storage.objects (aunque el insert en sí fuera válido).

create policy "public buckets are visible"
on storage.buckets
for select
using (public = true);

-- Repone el insert policy con el scoping por cuenta real (se había
-- debilitado a "bucket_id = 'logos'" solo para aislar la causa).
drop policy if exists "account insert own logos" on storage.objects;

create policy "account insert own logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = public.current_account_id()::text
);

-- Limpieza de las funciones de debug usadas durante el diagnóstico.
drop function if exists public.debug_logos_policies();
drop function if exists public.debug_foldername(text);
drop function if exists public.debug_storage_rls_enabled();
drop function if exists public.debug_role_grants();
drop function if exists public.debug_buckets_rls();
drop function if exists public.debug_buckets_policies();
