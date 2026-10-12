-- Precio opcional por concepto guardado — convierte el recordatorio de
-- texto que ya existía (item_concept_values) en un catálogo de
-- servicios/paquetes con precio: "Usar guardado" puede ahora rellenar
-- también el precio unitario, no solo el concepto. Se actualiza solo
-- cada vez que se vuelve a usar ese concepto con un monto distinto
-- (mismo criterio que ya tenía el texto del concepto) — no hay
-- pantalla aparte para "curar" una lista de precios.
alter table item_concept_values
  add column unit_price numeric;
