-- Integración con CRM Fácil (app hermana): cada cuenta configura su
-- propio endpoint + secreto, y cada cambio de presupuesto se reenvía
-- ahí (ver src/lib/crm/sync.ts). Ver SPEC-integracion-cotiza-facil.md.

-- 1. Moneda por cuenta — no existía ningún concepto de moneda en el
-- esquema (los montos solo se formatean con "$"); el payload del CRM
-- necesita un código ISO 4217 real.
alter table accounts
  add column currency text not null default 'USD'
  check (currency in ('USD', 'VES', 'EUR', 'COP', 'MXN', 'ARS'));

-- 2. updated_at en presupuestos — se setea a mano en cada update desde
-- el código (mismo criterio que clientes.updated_at), no por trigger.
-- Clave para que CRM Fácil descarte mensajes viejos que lleguen
-- desordenados.
alter table presupuestos
  add column updated_at timestamptz not null default now();

alter table presupuestos
  add column crm_sync_status text not null default 'not_synced'
  check (crm_sync_status in ('not_synced', 'synced', 'failed'));

-- 3. integrations — una fila por cuenta+proveedor (hoy solo
-- 'crm_facil', pero el modelo permite otros CRMs más adelante).
create table integrations (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  provider         text not null,
  endpoint_url     text not null check (endpoint_url like 'https://%'),
  secret_encrypted text not null,
  secret_last4     text,
  is_active        boolean not null default true,
  last_success_at  timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (account_id, provider)
);

alter table integrations enable row level security;

create policy "manage own integrations" on integrations
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());

-- 4. crm_sync_log — historial de intentos de envío. El dueño de la
-- cuenta puede leerlo (para mostrar el historial en la UI); todas las
-- escrituras las hace syncToCRM con el service role (createAdminClient,
-- bypasea RLS), así que no hace falta policy de insert/update para
-- "authenticated".
create table crm_sync_log (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null,
  presupuesto_id uuid not null,
  attempt        int not null,
  status         text not null check (status in ('success', 'failed', 'pending')),
  http_status    int,
  error          text,
  payload_hash   text,
  next_retry_at  timestamptz,
  created_at     timestamptz not null default now()
);

create index on crm_sync_log (status, next_retry_at);
create index on crm_sync_log (account_id, presupuesto_id);

alter table crm_sync_log enable row level security;

create policy "select own crm_sync_log" on crm_sync_log
  for select using (account_id = current_account_id());

-- 5. pg_cron + pg_net para los reintentos — comentado a propósito.
-- Correr esto a mano UNA VEZ, ya con la app deployada, reemplazando
-- <TU-DOMINIO> por el dominio real de producción y <CRON_SECRET> por
-- el valor de la env var CRON_SECRET (mismo valor configurado en
-- Vercel). El plan Hobby de Vercel solo permite cron diario, por eso
-- esto corre desde Supabase (cada 10 min) en vez de un cron de Vercel.
--
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select cron.schedule(
--   'crm-retry',
--   '*/10 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://<TU-DOMINIO>/api/crm/retry',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <CRON_SECRET>',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
