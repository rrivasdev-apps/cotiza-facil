-- Agrega "imagenes" (cuadrícula de imágenes fijas de la plantilla:
-- sellos, firmas, banners) a los tipos de sección permitidos. Las
-- imágenes viven en template_sections.config (jsonb), no hay columnas
-- nuevas. Compatible hacia atrás: el código viejo no conoce el tipo
-- pero tampoco existe ninguna fila con él hasta que se use.
alter table template_sections
  drop constraint template_sections_type_check,
  add constraint template_sections_type_check
    check (type in ('portada','tabla_datos','texto_libre','lista_items','clausulas','cierre','tabla_items','datos_cliente','dos_columnas','titulo','imagenes'));
