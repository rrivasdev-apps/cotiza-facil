-- Agrega "datos_cliente" (caja con nombre del cliente, fecha y N° de
-- presupuesto) a los tipos de sección permitidos — mismo motivo que la
-- migración anterior para tabla_items: el check constraint no se
-- actualiza solo.
alter table template_sections
  drop constraint template_sections_type_check,
  add constraint template_sections_type_check
    check (type in ('portada','tabla_datos','texto_libre','lista_items','clausulas','cierre','tabla_items','datos_cliente'));
