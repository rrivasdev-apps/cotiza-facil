-- Corrige el relleno de 20261113000000_presupuesto_currency.sql: ese
-- tomó la moneda de cada cuenta, pero todos los presupuestos creados
-- antes de existir presupuestos.currency están en USD (los montos se
-- mostraban con "$" y nunca se cargaron en otra moneda).
--
-- Solo toca filas que no son USD; los presupuestos nuevos ya guardan su
-- propia moneda desde el formulario, y este archivo corre una sola vez.
update presupuestos
set currency = 'USD'
where currency <> 'USD';
