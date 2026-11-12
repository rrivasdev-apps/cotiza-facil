-- Los buckets se creaban a mano en producción y nunca quedaron en una
-- migración, así que un proyecto nuevo (staging) no los tenía y
-- "Exportar PDF" fallaba al subir el archivo. Idempotente: en
-- producción, donde ya existen, no cambia nada.
--
-- presupuestos-pdf es privado a propósito: se accede solo con URLs
-- firmadas desde el servidor (ver createPresupuestoPdfSignedUrl).
insert into storage.buckets (id, name, public)
values
  ('logos', 'logos', true),
  ('presupuestos-pdf', 'presupuestos-pdf', false)
on conflict (id) do nothing;
