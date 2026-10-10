-- "Rechazado" como estado explícito, distinto de "enviado" (sin
-- respuesta todavía) — antes no había forma de distinguir "el cliente
-- dijo que no" de "todavía no contestó". rejected_at es la fecha de
-- ese rechazo, mismo criterio que approved_at.
alter table presupuestos
  drop constraint presupuestos_status_check,
  add constraint presupuestos_status_check
    check (status in ('borrador', 'enviado', 'aprobado', 'rechazado'));

alter table presupuestos
  add column rejected_at timestamptz;
