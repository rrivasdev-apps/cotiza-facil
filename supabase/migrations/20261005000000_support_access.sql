-- Acceso de soporte: permite que una cuenta marcada como admin de
-- plataforma (users.is_platform_admin) entre como una cuenta de
-- cliente real, pero solo si esa cuenta activó el acceso explícito
-- (accounts.support_access_until) y mientras no haya vencido. No hay
-- UI para marcar admins — es un flag manual, se activa por SQL
-- directo cuando haga falta sumar uno nuevo.
--
-- support_sessions es el registro de auditoría: cada vez que un admin
-- "entra como" una cuenta queda una fila acá, visible para el dueño
-- de esa cuenta (policy de solo lectura más abajo).

alter table users
  add column is_platform_admin boolean not null default false;

alter table accounts
  add column support_access_until timestamptz;

create table support_sessions (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references accounts(id) on delete cascade,
  admin_user_id  uuid not null references users(id),
  started_at     timestamptz not null default now()
);

create index on support_sessions (account_id);

alter table support_sessions enable row level security;

create policy "ver sesiones de soporte de la propia cuenta" on support_sessions
  for select
  using (account_id = current_account_id());

-- Sin policy de insert/update/delete a propósito: las filas las crea
-- únicamente el server action enterAsAccount, con el cliente admin
-- (service role, bypasea RLS) después de verificar is_platform_admin
-- y support_access_until — nunca directo desde el cliente.
