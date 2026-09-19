-- Correo remitente para el envío de presupuestos: es una propiedad de
-- la identidad de negocio de la cuenta (no de una plantilla puntual),
-- así que vive en accounts. Nullable — sin configurar, el envío queda
-- deshabilitado hasta que la cuenta lo cargue en /cuenta.
alter table accounts add column sender_email text;

-- accounts no tenía policy de update (el alta es solo vía service role,
-- ver scripts/seed-account.mjs) — esta permite que cada cuenta edite su
-- propia fila para configurar nombre y correo remitente.
create policy "update own account" on accounts
  for update
  using (id = current_account_id())
  with check (id = current_account_id());
