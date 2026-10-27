-- Cada compra confirmada en Guaybo se registra una sola vez aquí. purchase_key
-- (hash de comprador + momento de la compra + producto + plan + monto) es la
-- clave de idempotencia: Guaybo manda varios avisos por la misma compra
-- (purchase.created, payment.created, payment.updated) y solo el primero con
-- pago CONFIRMED debe activar o extender el plan.
--
-- status:
--   applied → el plan ya se aplicó a account_id
--   pending → el comprador aún no tiene cuenta propia; se aplica al registrarse
--   skipped → no se aplicó automáticamente (p. ej. cuenta "fundador"); revisar a mano
create table plan_activations (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  purchase_key      text not null unique,
  email             text not null,
  plan              text not null check (plan in ('pionero_mensual', 'pionero_anual')),
  status            text not null check (status in ('applied', 'pending', 'skipped')),
  account_id        uuid references accounts(id) on delete set null,
  webhook_event_id  uuid references guaybo_webhook_events(id) on delete set null,
  note              text
);

create index on plan_activations (lower(email)) where status = 'pending';

-- Sin policies a propósito: solo el service role.
alter table plan_activations enable row level security;

alter table guaybo_webhook_events add column outcome text;
