-- Bucket público para logos de plantilla. Público porque el logo debe
-- poder embeberse en PDFs/emails generados server-side sin URLs firmadas.
-- La ruta de cada objeto es "<account_id>/<archivo>"; las policies de
-- escritura restringen esa primera carpeta a la propia cuenta.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "account insert own logos"
on storage.objects
for insert
with check (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = public.current_account_id()::text
);

create policy "account update own logos"
on storage.objects
for update
using (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = public.current_account_id()::text
)
with check (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = public.current_account_id()::text
);

create policy "account delete own logos"
on storage.objects
for delete
using (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = public.current_account_id()::text
);
