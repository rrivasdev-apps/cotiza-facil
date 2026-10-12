-- Nombre corto opcional para un concepto guardado — cuando la
-- descripción es larga, o muchos productos empiezan igual, el nombre
-- corto es lo que se busca en el filtro de "Usar guardado" en vez de
-- la descripción completa. Nullable: las filas de antes de esto no
-- tienen uno, y el filtro cae de vuelta al texto completo (value)
-- cuando short_name es null.
alter table item_concept_values
  add column short_name text;
