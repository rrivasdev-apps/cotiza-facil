drop function if exists public.debug_logos_policies();

create or replace function public.debug_logos_policies()
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
  where schemaname = 'storage' and tablename = 'objects'
$$;

create or replace function public.debug_storage_rls_enabled()
returns table(relname text, relrowsecurity bool, relforcerowsecurity bool)
language sql
security definer
stable
set search_path = public
as $$
  select c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage' and c.relname = 'objects'
$$;

create or replace function public.debug_role_grants()
returns table(grantee text, privilege_type text)
language sql
security definer
stable
set search_path = public
as $$
  select grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'storage' and table_name = 'objects'
$$;
