-- El check constraint original de template_sections.type no conocía
-- "tabla_items" (nuevo tipo de sección de renglones cant./precio) —
-- lo agrega a la lista permitida.
alter table template_sections
  drop constraint template_sections_type_check,
  add constraint template_sections_type_check
    check (type in ('portada','tabla_datos','texto_libre','lista_items','clausulas','cierre','tabla_items'));
