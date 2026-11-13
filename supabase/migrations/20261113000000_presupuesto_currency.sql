-- Moneda por presupuesto: cada presupuesto conserva la moneda con la que
-- se elaboró aunque después cambie la moneda del workspace
-- (accounts.currency pasa a ser solo el valor inicial de los nuevos).
--
-- Compatible hacia atrás: columna con default, así el código anterior
-- (que no la envía) sigue insertando sin error.
alter table presupuestos
  add column currency text not null default 'USD'
  check (currency in ('USD', 'VES', 'EUR', 'COP', 'MXN', 'ARS'));

-- Los presupuestos existentes se mostraban con la moneda de su cuenta;
-- se les fija esa para no cambiar lo que ya ven los usuarios.
update presupuestos p
set currency = a.currency
from accounts a
where a.id = p.account_id;
