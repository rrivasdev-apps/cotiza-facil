-- "Regalar" una plantilla a otra cuenta: el emisor la envía (por
-- correo del destinatario), el receptor acepta o rechaza. Al aceptar,
-- se genera una copia independiente de la plantilla asociada a la
-- cuenta receptora (mismo mecanismo de remapeo de ids que
-- duplicateTemplate, pero contra el catálogo de OTRA cuenta — ver
-- acceptTemplateShare en src/lib/templates/share-actions.ts).
--
-- source_template_id / copied_template_id van "on delete set null"
-- (no cascade) para que esta tabla siga sirviendo de historial aunque
-- la plantilla original o la copia se borren después — de ahí que
-- source_template_name se guarde aparte, como snapshot.

create table template_shares (
  id                    uuid primary key default gen_random_uuid(),
  sender_account_id     uuid not null references accounts(id) on delete cascade,
  -- Snapshot del nombre de la cuenta emisora — RLS en `accounts` solo
  -- deja leer la propia (id = current_account_id()), así que el
  -- receptor no podría hacer join contra accounts para ver quién le
  -- envió esto sin este snapshot.
  sender_account_name   text not null,
  recipient_account_id  uuid not null references accounts(id) on delete cascade,
  recipient_email       text not null,
  source_template_id    uuid references templates(id) on delete set null,
  source_template_name  text not null,
  copied_template_id    uuid references templates(id) on delete set null,
  status                text not null default 'pendiente' check (status in ('pendiente', 'aceptada', 'rechazada')),
  created_at            timestamptz not null default now(),
  resolved_at           timestamptz
);

create index on template_shares (sender_account_id);
create index on template_shares (recipient_account_id, status);

alter table template_shares enable row level security;

-- Cada cuenta ve lo que envió y lo que le enviaron — nunca lo de una
-- tercera cuenta.
create policy "select sent or received shares" on template_shares
  for select
  using (sender_account_id = current_account_id() or recipient_account_id = current_account_id());

create policy "sender creates shares" on template_shares
  for insert
  with check (sender_account_id = current_account_id());

-- Solo el receptor puede pasar de "pendiente" a "aceptada"/"rechazada".
create policy "recipient resolves shares" on template_shares
  for update
  using (recipient_account_id = current_account_id())
  with check (recipient_account_id = current_account_id());
