-- Planes por cuenta: Gratis (1 plantilla, 5 presupuestos, sin colaboradores),
-- Pioneros mensual (1 colaborador) y Pioneros anual (5 colaboradores).
-- "fundador" son las cuentas que ya existían antes de los planes: sin
-- límites, para que nadie pierda lo que ya usaba.
--
-- La activación de un plan de pago es manual (o por webhook de Guaybo, más
-- adelante): se guarda el plan y su fecha de vencimiento. Al vencer, la
-- cuenta se comporta como Gratis sin tocar sus datos (ver account_is_free).

-- El default 'fundador' backfillea las filas existentes; luego el default
-- pasa a 'gratis' para las cuentas nuevas.
alter table accounts
  add column plan text not null default 'fundador'
  check (plan in ('gratis', 'pionero_mensual', 'pionero_anual', 'fundador'));

alter table accounts alter column plan set default 'gratis';

-- null = sin vencimiento (activación manual sin fecha).
alter table accounts add column plan_expires_at timestamptz;

-- Para cuentas nuevas el tope de colaboradores sale del plan; la columna
-- solo se usa como tope editable en las cuentas "fundador".
alter table accounts alter column max_collaborators set default 0;

-- ¿Aplican los límites del plan Gratis? Sí si el plan es Gratis, o si es
-- un plan de pago ya vencido.
create or replace function public.account_is_free(p_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select plan = 'gratis'
          or (plan in ('pionero_mensual', 'pionero_anual')
              and plan_expires_at is not null
              and plan_expires_at < now())
        from public.accounts
       where id = p_account_id
    ),
    false
  )
$$;

-- Los topes viven en triggers (y no solo en las server actions) para
-- cubrir todos los caminos de alta: crear, duplicar, galería y plantillas
-- compartidas, también los futuros.
create or replace function public.enforce_free_plan_template_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.account_is_free(new.account_id)
     and (select count(*) from public.templates where account_id = new.account_id) >= 1 then
    raise exception 'Tu plan Gratis incluye 1 plantilla. Mejora a Pioneros para crear más.'
      using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger enforce_free_plan_template_limit
  before insert on templates
  for each row execute function public.enforce_free_plan_template_limit();

create or replace function public.enforce_free_plan_presupuesto_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.account_is_free(new.account_id)
     and (select count(*) from public.presupuestos where account_id = new.account_id) >= 5 then
    raise exception 'Tu plan Gratis incluye 5 presupuestos. Mejora a Pioneros para crear más.'
      using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger enforce_free_plan_presupuesto_limit
  before insert on presupuestos
  for each row execute function public.enforce_free_plan_presupuesto_limit();
