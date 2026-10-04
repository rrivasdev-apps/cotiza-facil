-- Tabla de clientes propia (antes, el cliente de un presupuesto era
-- solo texto libre: client_name/client_email tipeados de cero cada
-- vez, sin reuso ni lugar donde guardar teléfono/dirección).
--
-- presupuestos.client_id es nullable y on delete set null a propósito
-- — mismo criterio que accounts.default_template_id: borrar un
-- cliente no debe romper ni bloquear los presupuestos ya hechos con
-- él. client_name/client_email en presupuestos siguen existiendo y
-- son la "foto" real que se imprimió — client_id es una referencia
-- para reusar datos y, más adelante, poder listar presupuestos por
-- cliente, no la fuente de verdad del documento ya enviado.

create table clientes (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name       text not null,
  email      text not null,
  phone      text,
  address    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index clientes_account_email_ci_unique
  on clientes (account_id, lower(email));

create index on clientes (account_id);

alter table clientes enable row level security;

create policy "manage own clientes" on clientes
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());

alter table presupuestos
  add column client_id uuid references clientes(id) on delete set null;
