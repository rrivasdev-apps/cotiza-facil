-- Recuperación de contraseña propia (ver src/lib/password-reset). Mismo
-- diseño que email_verifications: token de un solo uso del que en la base
-- solo queda el hash, de modo que una fuga de la tabla no permite
-- restablecer la contraseña de nadie.

create table password_resets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null
);

create index on password_resets (user_id);

-- Sin policies a propósito: solo el service role.
alter table password_resets enable row level security;
