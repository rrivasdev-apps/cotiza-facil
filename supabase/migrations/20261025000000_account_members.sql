-- Multi-usuario por workspace: una persona puede ser dueña de su propio
-- workspace y además colaboradora en otros. La membresía vive en
-- account_members; users.active_account_id guarda en cuál está trabajando.
--
-- Estrategia: las ~12 policies "account_id = current_account_id()" no se
-- tocan. Solo current_account_id() cambia para devolver el workspace
-- activo *validado contra membresía*, de modo que un active_account_id
-- manipulado nunca da acceso a un workspace ajeno.

-- 1. account_members --------------------------------------------------
create table account_members (
  user_id    uuid not null references users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  role       text not null check (role in ('owner', 'collaborator')),
  created_at timestamptz not null default now(),
  primary key (user_id, account_id)
);

create index on account_members (account_id);

-- 2. Columnas nuevas --------------------------------------------------
alter table users add column active_account_id uuid references accounts(id) on delete set null;

-- Un colaborador que se registra por invitación aún no tiene workspace
-- propio, así que account_id (su workspace "de origen") pasa a ser opcional.
alter table users alter column account_id drop not null;

-- Tope de colaboradores (sin contar al dueño). Lo edita un platform admin;
-- más adelante se enlaza a planes de pago.
alter table accounts add column max_collaborators int not null default 2 check (max_collaborators >= 0);

-- 3. Backfill: cada usuario actual es dueño de su cuenta --------------
insert into account_members (user_id, account_id, role)
select id, account_id, 'owner' from users where account_id is not null
on conflict do nothing;

update users set active_account_id = account_id where active_account_id is null;

-- Compatibilidad: toda fila nueva en users con cuenta propia (signup,
-- seed-account) queda como dueña y activa sin depender de código extra.
create or replace function public.users_create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_id is not null then
    insert into public.account_members (user_id, account_id, role)
    values (new.id, new.account_id, 'owner')
    on conflict do nothing;
    if new.active_account_id is null then
      update public.users set active_account_id = new.account_id where id = new.id;
    end if;
  end if;
  return new;
end
$$;

create trigger users_create_owner_membership
  after insert on users
  for each row execute function public.users_create_owner_membership();

-- 4. Helpers de RLS ---------------------------------------------------
create or replace function public.current_account_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.active_account_id
    from public.users u
    join public.account_members m
      on m.user_id = u.id and m.account_id = u.active_account_id
   where u.id = auth.uid()
$$;

create or replace function public.current_account_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select m.role
    from public.users u
    join public.account_members m
      on m.user_id = u.id and m.account_id = u.active_account_id
   where u.id = auth.uid()
$$;

create or replace function public.is_account_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.current_account_role() = 'owner', false)
$$;

-- 5. account_members / account_invitations ----------------------------
alter table account_members enable row level security;

-- Cada quien ve sus propias membresías (para el selector de workspace) y
-- los miembros del workspace activo. Escribe solo el service role.
create policy "select own or workspace members" on account_members
  for select
  using (user_id = auth.uid() or account_id = current_account_id());

create table account_invitations (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  invited_by  uuid references users(id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index on account_invitations (account_id);

-- Un solo pendiente por email y workspace.
create unique index account_invitations_pending_unique
  on account_invitations (account_id, lower(email))
  where status = 'pending';

alter table account_invitations enable row level security;

-- El dueño lista las invitaciones de su workspace; crear/revocar/aceptar
-- lo hace el service role tras validar (el token_hash nunca sale a la UI).
create policy "owner select invitations" on account_invitations
  for select
  using (account_id = current_account_id() and is_account_owner());

-- 6. users: ver a los miembros del workspace activo -------------------
drop policy "select account users" on users;

create policy "select self or workspace members" on users
  for select
  using (
    id = auth.uid()
    or id in (select user_id from account_members where account_id = current_account_id())
  );

-- 7. Políticas de solo-dueño ------------------------------------------
-- Plantillas y su estructura: todos los miembros las leen (los
-- colaboradores las necesitan para crear presupuestos), solo el dueño
-- las modifica. field_saved_values e item_concept_values quedan abiertas
-- a todos los miembros a propósito: el formulario de presupuesto las
-- escribe (autocompletar valores y guardar conceptos de ítems).
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'field_catalog', 'templates', 'template_sections',
    'template_section_fields', 'template_pages'
  ] loop
    execute format('drop policy "manage own %1$s" on %1$I', tbl);
    execute format(
      'create policy "select own %1$s" on %1$I for select using (account_id = current_account_id())',
      tbl);
    execute format(
      'create policy "owner insert %1$s" on %1$I for insert with check (account_id = current_account_id() and is_account_owner())',
      tbl);
    execute format(
      'create policy "owner update %1$s" on %1$I for update using (account_id = current_account_id() and is_account_owner()) with check (account_id = current_account_id() and is_account_owner())',
      tbl);
    execute format(
      'create policy "owner delete %1$s" on %1$I for delete using (account_id = current_account_id() and is_account_owner())',
      tbl);
  end loop;
end
$$;

-- Integraciones: guardan credenciales cifradas del CRM; el colaborador
-- no necesita ni leerlas (el envío al CRM corre con el service role).
drop policy "manage own integrations" on integrations;
create policy "owner manage integrations" on integrations
  for all
  using (account_id = current_account_id() and is_account_owner())
  with check (account_id = current_account_id() and is_account_owner());

-- Datos de la cuenta (nombre, remitente, moneda, plantilla por defecto).
drop policy "update own account" on accounts;
create policy "owner update account" on accounts
  for update
  using (id = current_account_id() and is_account_owner())
  with check (id = current_account_id() and is_account_owner());

-- 8. Storage de logos: subir/reemplazar/borrar solo el dueño ----------
-- (select queda abierto a miembros: el upsert lo necesita y el bucket
-- es público de todos modos).
drop policy if exists "account insert own logos" on storage.objects;
drop policy if exists "account update own logos" on storage.objects;
drop policy if exists "account delete own logos" on storage.objects;

create policy "owner insert own logos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.is_account_owner()
  );

create policy "owner update own logos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.is_account_owner()
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.is_account_owner()
  );

create policy "owner delete own logos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_account_id()::text
    and public.is_account_owner()
  );
