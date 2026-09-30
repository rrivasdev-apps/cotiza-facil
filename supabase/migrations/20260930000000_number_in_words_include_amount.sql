-- Opción para que un campo "valor en letras" también incluya el monto
-- en números entre paréntesis, ej: "SEISCIENTOS CINCUENTA EXACTOS ($ 650,00)".

alter table template_section_fields
  add column number_in_words_include_amount boolean not null default false;
