create or replace function public.debug_buckets_rls()
returns table(relname text, relrowsecurity bool, relforcerowsecurity bool)
language sql
security definer
stable
set search_path = public
as $$
  select c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage' and c.relname = 'buckets'
$$;

create or replace function public.debug_buckets_policies()
returns table(
  policyname text,
  permissive text,
  roles name[],
  cmd text,
  qual text,
  with_check text
)
language sql
security definer
stable
set search_path = public
as $$
  select policyname, permissive, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'storage' and tablename = 'buckets'
$$;
