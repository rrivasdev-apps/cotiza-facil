-- Dos cosas nuevas para template_section_fields:
--
-- 1. `visible` — un campo puede seguir pidiéndose al cargar un
--    presupuesto (por ejemplo, porque alimenta un campo "valor en
--    letras") sin imprimirse en el documento. Default true: todos los
--    campos existentes siguen viéndose igual que antes.
--
-- 2. `composite_template` — permite una fila que no es "un campo" sino
--    una línea armada a mano con texto libre + varios campos
--    intercalados (ej. "Son: {{id:<uuid>}} (Bs. {{id:<uuid>}})"). Para
--    esa fila, field_catalog_id va null — es una línea de
--    presentación, no captura su propio dato. El check constraint
--    obliga a que sea una cosa o la otra, nunca ninguna ni las dos.
alter table template_section_fields
  alter column field_catalog_id drop not null,
  add column visible boolean not null default true,
  add column composite_template text,
  add constraint template_section_fields_field_or_composite_chk
    check ((field_catalog_id is not null) <> (composite_template is not null));
