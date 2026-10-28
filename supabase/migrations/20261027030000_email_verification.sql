-- Verificación de correo propia. El registro crea el usuario con
-- admin.createUser({ email_confirm: true }), así que la "confirmación de
-- email" de Supabase Auth no aplica. Sin esto, alguien podía registrarse con
-- el correo de otra persona que ya pagó y reclamar su plan pendiente.
--
-- email_verified_at null → el correo no está probado; no se aplican planes
-- pendientes (plan_activations) a su nombre hasta que lo verifique.
alter table users add column email_verified_at timestamptz;

-- Los usuarios que ya existen se dan por verificados: son anteriores a esta
-- regla y ya recibieron sus planes.
update users set email_verified_at = now() where email_verified_at is null;

-- Token de un solo uso. En la base solo queda su hash (misma idea que
-- account_invitations.token_hash): una fuga de la tabla no permite verificar.
create table email_verifications (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null
);

create index on email_verifications (user_id);

-- Sin policies a propósito: solo el service role.
alter table email_verifications enable row level security;
