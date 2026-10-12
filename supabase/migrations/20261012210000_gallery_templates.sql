-- Permite que un administrador de plataforma (users.is_platform_admin,
-- ver 20261005000000_support_access.sql) convierta una plantilla ya
-- armada en una cuenta en un elemento más de /plantillas/galeria —
-- antes la galería era puro código estático (gallery.ts). Las filas de
-- esta tabla se combinan con GALLERY_TEMPLATES en tiempo de lectura
-- (ver gallery-db.ts); no reemplazan el array estático.
--
-- "definition" guarda la misma forma que GalleryTemplateDef (theme,
-- header, footer, totalFieldName, pages) — mismo JSON que ya arma
-- buildGalleryPreviewDocument/createTemplateFromGallery para una
-- plantilla de gallery.ts, solo que acá viene serializado desde una
-- plantilla real en vez de estar escrito a mano.
create table gallery_templates (
  id                      uuid primary key default gen_random_uuid(),
  key                     text not null unique,
  name                    text not null,
  description             text not null,
  preview_image           text not null,
  definition              jsonb not null,
  source_template_id      uuid references templates(id) on delete set null,
  created_by_account_id   uuid references accounts(id) on delete set null,
  created_at              timestamptz not null default now()
);

alter table gallery_templates enable row level security;

-- De lectura: la galería la ve cualquier cuenta autenticada, igual que
-- las plantillas estáticas de gallery.ts (no hay aislamiento por
-- cuenta acá a propósito — es contenido de catálogo, no datos de
-- ninguna cuenta).
create policy "ver plantillas de galeria" on gallery_templates
  for select
  to authenticated
  using (true);

-- Sin policy de insert/update/delete a propósito: las filas las crea
-- únicamente el server action addTemplateToGallery, con el cliente
-- admin (service role, bypasea RLS) después de verificar
-- is_platform_admin — nunca directo desde el cliente.
