-- Un campo tipo "moneda" puede calcularse solo a partir de una fórmula
-- que referencia otros campos moneda de la plantilla, ej:
-- "{{id:<uuid-precio>}} * {{id:<uuid-cantidad>}}" — mismo formato que
-- composite_template (texto con tokens {{id:<uuid>}}), pero acá se
-- evalúa como aritmética en vez de interpolarse como texto. A
-- diferencia de composite_template, un campo con formula SÍ tiene
-- field_catalog_id propio: sigue siendo un campo moneda real, solo que
-- su valor no lo escribe el usuario sino que se calcula al guardar.
alter table template_section_fields
  add column formula text;
