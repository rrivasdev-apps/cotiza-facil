-- Conceptos de ítem recordados: a diferencia de field_saved_values,
-- esto no cuelga de un campo del catálogo — "Concepto" es una columna
-- fija de cualquier sección tabla_items, igual en todas las
-- plantillas, no un campo configurable. Se guarda solo (sin que el
-- usuario tenga que activarlo ni tocar nada) cada vez que se guarda un
-- presupuesto con ítems, y sirve de sugerencia para el siguiente.

create table item_concept_values (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  value      text not null,
  created_at timestamptz not null default now()
);

create unique index item_concept_values_account_value_ci_unique
  on item_concept_values (account_id, lower(value));

alter table item_concept_values enable row level security;

create policy "manage own item_concept_values" on item_concept_values
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());
