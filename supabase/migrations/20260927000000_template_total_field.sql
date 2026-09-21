-- Prepara el terreno para reportes futuros (Fase 2 del brief original:
-- presupuestos por período, cliente que más pide) sin construir los
-- reportes todavía — necesitan una columna numérica confiable para
-- sumar/agrupar, no rebuscar en el jsonb `data` con lógica distinta
-- por plantilla.
--
-- templates.total_field_id: cuál campo de LA PLANTILLA es "el total"
-- — mismo formato de referencia que ya usan fórmula/línea combinada
-- (un field_catalog_id real, o el id sintético "section-total:<id>"
-- de una tabla_items). Lo declara la plantilla una sola vez.
--
-- presupuestos.total_amount: el valor ya resuelto para ESE
-- presupuesto puntual, completado solo al guardar — ver
-- buildPresupuestoData/total_amount en presupuestos/actions.ts.
alter table templates
  add column total_field_id text;

alter table presupuestos
  add column total_amount numeric;
