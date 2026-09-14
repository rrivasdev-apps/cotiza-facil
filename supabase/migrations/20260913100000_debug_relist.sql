create or replace function public.debug_relist_policies(p_schema text, p_table text)
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
  where schemaname = p_schema and tablename = p_table
$$;
