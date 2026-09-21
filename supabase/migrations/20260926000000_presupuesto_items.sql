-- Soporte para el tipo de sección "tabla_items": a diferencia de una
-- sección normal (campos fijos definidos en la plantilla), acá la
-- cantidad de renglones la decide quien carga CADA presupuesto (1
-- ítem, 10 ítems, etc.) — no tiene sentido modelarlo como
-- template_section_fields. Se guarda en su propia columna, separada
-- de `data` (que sigue siendo field_catalog_id -> valor), como un
-- objeto { [section_id]: [{ concepto, cantidad, precioUnitario }] }.
alter table presupuestos
  add column items jsonb not null default '{}'::jsonb;
