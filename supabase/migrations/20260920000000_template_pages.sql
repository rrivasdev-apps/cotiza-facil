-- Encabezado y pie de página: uno solo por plantilla, compartido entre
-- todas sus páginas (cada página elige si lo muestra vía
-- template_pages.show_header/show_footer, ver abajo). Vive en
-- templates porque es exactamente un valor por plantilla, igual que
-- theme. Forma: { alignH, alignV, elements: [{type:'logo'}|{type:'page_number'}|{type:'texto', text}] }.
alter table templates add column header jsonb not null default '{}'::jsonb;
alter table templates add column footer jsonb not null default '{}'::jsonb;

-- Páginas explícitas del documento. Antes cada sección de
-- template_sections mapeaba implícitamente a una página del PDF (una
-- sección = una página, hardcodeado en el renderer); ahora una página
-- agrupa una o más secciones en su Cuerpo, controla si aplica el
-- encabezado/pie compartido de la plantilla, y cómo se alinea su
-- contenido.
create table template_pages (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references accounts(id) on delete cascade,
  template_id    uuid not null references templates(id) on delete cascade,
  order_index    int not null default 0,
  title          text not null,
  show_header    boolean not null default true,
  show_footer    boolean not null default true,
  body_align_h   text not null default 'left' check (body_align_h in ('left','center','right')),
  body_align_v   text not null default 'top' check (body_align_v in ('top','center','bottom'))
);

create index on template_pages (template_id, order_index);
create index on template_pages (account_id);

alter table template_pages enable row level security;

create policy "manage own template_pages" on template_pages
  for all
  using (account_id = current_account_id())
  with check (account_id = current_account_id());

-- Backfill: una "Página 1" por cada plantilla que ya tenga secciones,
-- para no perder el contenido existente al agregar la columna.
insert into template_pages (account_id, template_id, order_index, title)
select distinct account_id, template_id, 0, 'Página 1'
from template_sections;

alter table template_sections add column page_id uuid references template_pages(id) on delete cascade;

update template_sections ts
set page_id = tp.id
from template_pages tp
where tp.template_id = ts.template_id;

alter table template_sections alter column page_id set not null;

create index on template_sections (page_id, order_index);
