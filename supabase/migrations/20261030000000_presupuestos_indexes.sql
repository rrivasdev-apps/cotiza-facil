-- Índices para las consultas que crecen con el uso.
--
-- (account_id, created_at desc): el listado de presupuestos y el "último
-- creado" del inicio filtran por cuenta (RLS) y ordenan por fecha; sin
-- este índice Postgres ordena todos los de la cuenta en cada carga.
--
-- client_id: es una FK on delete set null, así que borrar un cliente
-- obliga a buscar sus presupuestos; sin índice eso es un barrido completo
-- de la tabla. También sirve para listar presupuestos por cliente.
--
-- No se agrega índice sobre item_concept_values(account_id): el único
-- (account_id, lower(value)) ya empieza por account_id y lo cubre.

create index if not exists presupuestos_account_created_idx
  on presupuestos (account_id, created_at desc);

create index if not exists presupuestos_client_id_idx
  on presupuestos (client_id);
