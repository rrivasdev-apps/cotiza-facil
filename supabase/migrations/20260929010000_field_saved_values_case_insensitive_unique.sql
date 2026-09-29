-- Dos valores guardados que solo difieren en mayúsculas/minúsculas
-- cuentan como el mismo valor (ej. "Sonido profesional" y "sonido
-- PROFESIONAL" no deben poder coexistir).

create unique index field_saved_values_field_value_ci_unique
  on field_saved_values (field_catalog_id, lower(value));
