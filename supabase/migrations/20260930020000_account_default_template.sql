-- Plantilla por defecto de la cuenta — se precarga sola al elegir
-- plantilla en "Nuevo presupuesto" (y guía el estado vacío de
-- Presupuestos). "on delete set null" para que borrar esa plantilla
-- no bloquee nada, solo deje a la cuenta sin default hasta que elija
-- otra.

alter table accounts
  add column default_template_id uuid references templates(id) on delete set null;
