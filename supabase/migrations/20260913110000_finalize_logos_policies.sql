-- Segunda causa raíz encontrada: uploadLogo usa upsert (para poder
-- reemplazar el logo de una plantilla), y `insert ... on conflict do
-- update` requiere privilegio de SELECT (para detectar el conflicto),
-- que también pasa por RLS. Sin una policy de select en
-- storage.objects, cualquier upload con upsert:true fallaba con el
-- mismo error genérico de RLS, sin importar la policy de insert.

drop policy if exists "debug wide open insert" on storage.objects;

create policy "account select own logos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = public.current_account_id()::text
);

create policy "account insert own logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = public.current_account_id()::text
);

-- Limpieza de las funciones de debug usadas durante el diagnóstico.
drop function if exists public.debug_relist_policies(text, text);
