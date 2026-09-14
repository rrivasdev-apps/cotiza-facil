drop policy if exists "debug anon insert logos" on storage.objects;
drop policy if exists "account insert own logos" on storage.objects;

create policy "debug wide open insert"
on storage.objects
for insert
with check (true);
