-- Tema por página: cada página puede decidir si usa la imagen de fondo
-- del tema, y puede reemplazar el color de la página y el del texto.
-- Compatible hacia atrás: las páginas existentes siguen mostrando la
-- imagen (default true) y heredando los colores del tema (null).
alter table template_pages add column show_background_image boolean not null default true;
alter table template_pages add column bg_color text;
alter table template_pages add column text_color text;

-- Solo hex (#rgb / #rrggbb / con alfa) — el valor termina dentro de CSS
-- en el PDF, así que no se acepta nada más.
alter table template_pages add constraint template_pages_bg_color_hex
  check (bg_color is null or bg_color ~ '^#[0-9a-fA-F]{3,8}$');
alter table template_pages add constraint template_pages_text_color_hex
  check (text_color is null or text_color ~ '^#[0-9a-fA-F]{3,8}$');
