-- Constancia de que cada usuario aceptó los términos y la política de
-- privacidad, y de cuál versión (LEGAL.version en src/lib/legal.ts).
-- null = usuario anterior a esta columna, que se registró sin ese paso.

alter table users
  add column terms_accepted_at timestamptz,
  add column terms_accepted_version text;
