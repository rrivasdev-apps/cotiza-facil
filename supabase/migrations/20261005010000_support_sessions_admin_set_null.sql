-- support_sessions.admin_user_id no tenía "on delete" (default:
-- bloquea el delete) — eso impide borrar la fila de users de un admin
-- mientras queden sesiones de soporte suyas en el registro. Mismo
-- criterio que presupuestos.client_id: el registro de auditoría
-- sobrevive aunque el admin referenciado se borre (caso real: una
-- cuenta de prueba usada para QA), solo se desvincula la referencia.

alter table support_sessions
  alter column admin_user_id drop not null;

alter table support_sessions
  drop constraint support_sessions_admin_user_id_fkey;

alter table support_sessions
  add constraint support_sessions_admin_user_id_fkey
  foreign key (admin_user_id) references users(id) on delete set null;
