-- Solicitud de eliminación de cuenta con plazo de gracia.
--
-- Mientras deletion_requested_at tenga fecha, la cuenta sigue funcionando
-- y el propietario puede cancelar. Pasado el plazo (DELETION_GRACE_DAYS en
-- src/lib/account-deletion/purge.ts) un cron diario borra los archivos y
-- los datos. null = sin solicitud.

alter table accounts
  add column deletion_requested_at timestamptz;

create index accounts_deletion_requested_idx
  on accounts (deletion_requested_at)
  where deletion_requested_at is not null;
