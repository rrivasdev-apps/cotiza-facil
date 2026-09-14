create or replace function public.debug_logos_policies()
returns table(policyname text, cmd text, qual text, with_check text)
language sql
security definer
stable
set search_path = public
as $$
  select policyname, cmd, qual, with_check
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
$$;

create or replace function public.debug_foldername(path text)
returns text[]
language sql
stable
as $$
  select storage.foldername(path)
$$;
