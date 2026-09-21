-- Permite marcar un campo de texto como "valor en letras" de un campo
-- de tipo Moneda de la misma plantilla — al guardar un presupuesto, su
-- valor se calcula solo (monto escrito en palabras) en vez de pedirlo
-- al usuario. on delete set null: si se borra el campo Moneda de
-- origen, el campo de texto vuelve a ser manual en lugar de romperse.
alter table template_section_fields
  add column number_in_words_of uuid references field_catalog(id) on delete set null;
