drop policy if exists "account insert own logos" on storage.objects;

create policy "account insert own logos"
on storage.objects
for insert
with check (
  bucket_id = 'logos'
  and auth.uid() is not null
);
