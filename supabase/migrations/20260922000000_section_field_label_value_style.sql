-- Reemplaza font_family/font_size (solo aplicaban al valor) por dos
-- blobs jsonb — label_style y value_style — cada uno con
-- {fontFamily, fontSize, bold, italic, underline}. Mismo patrón que
-- theme/header/footer en templates: evita seguir agregando columnas
-- sueltas cada vez que se suma un atributo de estilo nuevo.
alter table template_section_fields
  add column label_style jsonb not null default '{}'::jsonb,
  add column value_style jsonb not null default '{}'::jsonb;

update template_section_fields
set value_style = jsonb_strip_nulls(jsonb_build_object('fontFamily', font_family, 'fontSize', font_size))
where font_family is not null or font_size is not null;

alter table template_section_fields
  drop column font_family,
  drop column font_size;
