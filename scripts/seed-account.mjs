// Crea una cuenta + usuario owner real, vía service role.
// Las cuentas no se dan de alta desde el cliente (ver schema.sql), así
// que esta es la única forma soportada de crear una cuenta hoy.
//
// Uso:
//   node --env-file=.env.local scripts/seed-account.mjs --name "Luis Rivas" --email luis@example.com [--password ...] [--out archivo.txt]

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

function generatePassword() {
  return randomBytes(18).toString("base64url");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name || !args.email) {
    console.error("Uso: --name \"Nombre\" --email correo@ejemplo.com [--password ...] [--out archivo.txt]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }

  const password = args.password ?? generatePassword();
  const admin = createClient(url, serviceKey);

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .insert({ name: args.name })
    .select()
    .single();
  if (accountError) throw new Error(`No se pudo crear la cuenta: ${accountError.message}`);

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: args.email,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(`No se pudo crear el usuario: ${authError.message}`);

  const { error: userError } = await admin.from("users").insert({
    id: authUser.user.id,
    account_id: account.id,
    email: args.email,
  });
  if (userError) throw new Error(`No se pudo vincular el usuario a la cuenta: ${userError.message}`);

  const summary = [
    `account_id: ${account.id}`,
    `account_name: ${args.name}`,
    `email: ${args.email}`,
    `password: ${password}`,
  ].join("\n");

  console.log("Cuenta creada:\n" + summary);

  const outPath = args.out ?? ".dev-login-credentials.txt";
  writeFileSync(outPath, summary + "\n");
  console.log(`\nCredenciales guardadas en ${outPath}`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
