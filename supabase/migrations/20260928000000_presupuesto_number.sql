-- N° de presupuesto autogenerado y consecutivo, por cuenta (cada
-- cuenta tiene su propia numeración, empezando en 1 — no es un
-- correlativo global entre cuentas).
--
-- next_presupuesto_number vive en accounts (no en una tabla aparte)
-- porque es exactamente un contador: el próximo número a repartir.
-- claim_next_presupuesto_number() lo reparte con un solo UPDATE
-- (no un SELECT + UPDATE desde la app) para que el incremento sea
-- atómico — dos presupuestos creados casi al mismo tiempo no pueden
-- terminar con el mismo número, porque el UPDATE toma un lock de fila
-- que serializa los llamados concurrentes.
alter table accounts
  add column next_presupuesto_number integer not null default 1;

alter table presupuestos
  add column number integer;

alter table presupuestos
  add constraint presupuestos_account_number_unique unique (account_id, number);

create or replace function claim_next_presupuesto_number(p_account_id uuid)
returns integer
language plpgsql
security invoker
as $$
declare
  v_number integer;
begin
  update accounts
    set next_presupuesto_number = next_presupuesto_number + 1
    where id = p_account_id
    returning next_presupuesto_number - 1 into v_number;
  return v_number;
end;
$$;

grant execute on function claim_next_presupuesto_number(uuid) to authenticated;
