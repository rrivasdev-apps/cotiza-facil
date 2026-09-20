-- Tipo y tamaño de letra por campo asignado a una sección. Es una
-- propiedad de la asignación (template_section_fields), no del campo
-- del catálogo: el mismo campo puede usarse en dos secciones con
-- tratamiento visual distinto. null = hereda la tipografía del theme
-- de la plantilla (comportamiento actual, sin cambios).
alter table template_section_fields
  add column font_family text check (font_family in ('manrope', 'inter', 'jetbrains-mono')),
  add column font_size integer check (font_size between 8 and 72);
