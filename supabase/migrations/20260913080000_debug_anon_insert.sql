create policy "debug anon insert logos"
on storage.objects
for insert
to anon
with check (bucket_id = 'logos');
