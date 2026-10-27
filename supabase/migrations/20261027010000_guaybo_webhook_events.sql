-- Registro de cada aviso que Guaybo envía a /api/webhooks/guaybo. Se guarda
-- tal cual llega (cuerpo crudo + JSON si se pudo leer) para poder ver el
-- formato real antes de activar planes a partir de él, y para auditar o
-- reprocesar pagos después.
--
-- Sin policies a propósito: solo la escribe y lee el service role.
create table guaybo_webhook_events (
  id          uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_type  text,
  raw_body    text not null,
  payload     jsonb,
  headers     jsonb not null default '{}'::jsonb,
  processed   boolean not null default false,
  error       text
);

create index on guaybo_webhook_events (received_at desc);

alter table guaybo_webhook_events enable row level security;
