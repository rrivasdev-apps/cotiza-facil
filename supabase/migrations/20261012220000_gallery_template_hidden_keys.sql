-- Deja que un administrador de plataforma "elimine" de la galería una
-- plantilla de las que viven en código (GALLERY_TEMPLATES, ej.
-- "Ejecutivo Formal") — a esas no se les puede borrar la fila porque
-- no son filas, así que en vez de eso se guarda acá su key: la
-- galería (ver loadAllGalleryTemplates en gallery-db.ts) las sigue
-- leyendo del array estático pero las descarta si su key aparece acá.
-- Una plantilla agregada por un admin (gallery_templates, ver
-- 20261012210000) no pasa por esta tabla — a esa se le borra la fila
-- directo, de verdad.
create table gallery_template_hidden_keys (
  key                    text primary key,
  hidden_by_account_id   uuid references accounts(id) on delete set null,
  hidden_at              timestamptz not null default now()
);

alter table gallery_template_hidden_keys enable row level security;

create policy "ver keys ocultas de la galeria" on gallery_template_hidden_keys
  for select
  to authenticated
  using (true);

-- Sin policy de insert/delete a propósito — mismo motivo que
-- gallery_templates: solo el server action removeTemplateFromGallery,
-- con el cliente admin, después de verificar is_platform_admin.
