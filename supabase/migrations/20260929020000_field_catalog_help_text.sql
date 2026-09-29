-- Texto de ayuda opcional por campo del catálogo: si se llena, el
-- formulario de presupuesto muestra un ícono de ayuda junto al campo
-- con este mensaje al pasar el mouse.

alter table field_catalog
  add column help_text text;
