-- Agrega "dos_columnas" (etiqueta a la izquierda, campos apilados a
-- la derecha, ancho de columna configurable) y "titulo" (texto grande
-- en negrita/outline, para banners tipo "RIDER TÉCNICO") a los tipos
-- de sección permitidos.
alter table template_sections
  drop constraint template_sections_type_check,
  add constraint template_sections_type_check
    check (type in ('portada','tabla_datos','texto_libre','lista_items','clausulas','cierre','tabla_items','datos_cliente','dos_columnas','titulo'));
