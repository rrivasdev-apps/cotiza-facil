-- Vencimiento del enlace de aprobación (/aprobar/<id>).
--
-- El enlace usa el id del presupuesto como único secreto, así que sin
-- vencimiento un correo reenviado o filtrado serviría para siempre.
-- Cada envío o reenvío renueva el plazo (30 días, ver
-- src/lib/presupuestos/approval-link.ts); "revocar" lo deja en la hora
-- actual. null = sin vencimiento (borradores, y aprobados/rechazados: una
-- vez que el cliente decidió, el enlace sigue sirviendo para consultarlo).

alter table presupuestos
  add column approval_expires_at timestamptz;

-- Los enviados que ya circulan reciben 30 días de gracia desde hoy, para
-- no matar enlaces que clientes todavía tienen en el correo.
update presupuestos
  set approval_expires_at = now() + interval '30 days'
  where status = 'enviado';
