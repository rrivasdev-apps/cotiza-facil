-- Consola de Presupuestos — esquema inicial (Supabase / Postgres)
-- Corre esto en el SQL editor de Supabase, o como primera migración.
--
-- Nota: template_sections y template_section_fields llevan account_id
-- denormalizado (no solo el id de su tabla padre) a propósito, para que
-- cada policy de RLS sea una comparación directa en vez de un join
-- anidado contra templates/template_sections. Es el único ajuste
-- respecto al documento de arquitectura original — ver CLAUDE.md.

create extension if not exists "pgcrypto";

-- 1. accounts ---------------------------------------------------------
create table accounts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- 2. users (1:1 con auth.users, agrega el vínculo a la cuenta) --------
create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  email      text not null,
  role       text not null default 'owner',
  created_at timestamptz not null default now()
);

create index on users (account_id);

-- Helper: resuelve la cuenta del usuario autenticado ------------------
create or replace function public.current_account_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select account_id from public.users where id = auth.uid()
$$;

-- 3. field_catalog — catálogo de campos, por cuenta -------------------
create table field_catalog (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name       text not null,
  data_type  text not null check (data_type in ('texto_corto','texto_largo','fecha','moneda','lista')),
  created_at timestamptz not null default now()
);

create index on field_catalog (account_id);

-- 4. templates — Tema + metadata de la plantilla ----------------------
create table templates (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name       text not null,
  theme      jsonb not null default '{}'::jsonb, -- acento, degradado, tipografía
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on templates (account_id);

-- 5. template_sections — Estructura: una fila por sección -------------
create table template_sections (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade, -- denormalizado, ver nota arriba
  template_id uuid not null references templates(id) on delete cascade,
  type        text not null check (type in ('portada','tabla_datos','texto_libre','lista_items','clausulas','cierre')),
  title       text not null,
  order_index int not null default 0,
  config      jsonb not null default '{}'::jsonb -- opciones propias del tipo
);

create index on template_sections (template_id, order_index);
create index on template_sections (account_id);

-- 6. template_section_fields — qué campos usa cada sección ------------
create table template_section_fields (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade, -- denormalizado, ver nota arriba
  section_id       uuid not null references template_sections(id) on delete cascade,
  field_catalog_id uuid not null references field_catalog(id) on delete restrict,
  order_index      int not null default 0,
  required         boolean not null default false
);

create index on template_section_fields (section_id, order_index);
create index on template_section_fields (account_id);

-- 7. presupuestos — una Plantilla ya rellenada para un cliente --------
create table presupuestos (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  template_id  uuid not null references templates(id) on delete restrict,
  client_name  text not null,
  client_email text not null,
  status       text not null default 'borrador' check (status in ('borrador','enviado','aprobado')),
  data         jsonb not null default '{}'::jsonb, -- valores rellenados, por field_catalog_id
  pdf_path     text, -- ruta en Supabase Storage
  sent_at      timestamptz,
  approved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index on presupuestos (account_id, status);
create index on presupuestos (template_id);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table accounts                  enable row level security;
alter table users                     enable row level security;
alter table field_catalog             enable row level security;
alter table templates                 enable row level security;
alter table template_sections         enable row level security;
alter table template_section_fields   enable row level security;
alter table presupuestos              enable row level security;

-- accounts: cada usuario solo ve su propia cuenta (alta/edición vía
-- flujo de administración con service role, no desde el cliente)
create policy "select own account" on accounts
  for select using (id = current_account_id());

-- users: cada usuario ve a los demás usuarios de su misma cuenta
create policy "select account users" on users
  for select using (account_id = current_account_id());

-- field_catalog
create policy "manage own field_catalog" on field_catalog
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());

-- templates
create policy "manage own templates" on templates
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());

-- template_sections
create policy "manage own template_sections" on template_sections
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());

-- template_section_fields
create policy "manage own template_section_fields" on template_section_fields
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());

-- presupuestos
create policy "manage own presupuestos" on presupuestos
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());

-- ---------------------------------------------------------------------
-- Antes de seguir: crear dos cuentas de prueba y confirmar que ninguna
-- puede leer ni un dato de la otra, en cada tabla. No basta con que las
-- policies "se vean bien" — es la pieza que reemplaza el aislamiento
-- que faltaba cuando esto era un artifact de Claude.
-- ---------------------------------------------------------------------
