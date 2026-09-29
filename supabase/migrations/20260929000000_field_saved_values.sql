-- Valores guardados por campo: un campo del catálogo (texto_corto o
-- texto_largo) puede marcarse para reusar valores ya escritos en otros
-- presupuestos (ej. descripciones de servicio que se repiten).

alter table field_catalog
  add column use_saved_values boolean not null default false;

create table field_saved_values (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  field_catalog_id uuid not null references field_catalog(id) on delete cascade,
  value            text not null,
  created_at       timestamptz not null default now(),
  unique (field_catalog_id, value)
);

create index on field_saved_values (account_id);

alter table field_saved_values enable row level security;

create policy "manage own field_saved_values" on field_saved_values
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());
