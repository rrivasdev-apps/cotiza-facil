// Aplica migraciones con la regla del repo: ninguna llega a producción sin
// haber corrido antes en staging.
//
//   npm run db:staging   aplica las pendientes a staging
//   npm run db:prod      aplica a producción, solo si staging ya las tiene
//   npm run db:status    muestra qué falta en cada una, sin aplicar nada
//
// Producción es el proyecto vinculado con `supabase link`; staging se
// indica con STAGING_DB_URL en .env.staging (ver .env.staging.example).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// "pending" = existe en supabase/migrations pero no en esa base.
export function pendingVersions(migrations) {
  return migrations.filter((migration) => migration.local && !migration.remote).map((migration) => migration.local);
}

// Las que producción necesita y staging todavía no tiene.
export function missingInStaging(prodMigrations, stagingMigrations) {
  const inStaging = new Set(stagingMigrations.filter((migration) => migration.remote).map((migration) => migration.remote));
  return pendingVersions(prodMigrations).filter((version) => !inStaging.has(version));
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function listMigrations(dbUrl) {
  const args = ["migration", "list", "--output-format", "json", ...(dbUrl ? ["--db-url", dbUrl] : [])];
  const result = spawnSync("supabase", args, { encoding: "utf8" });
  if (result.status !== 0) fail(`No se pudo leer las migraciones${dbUrl ? " de staging" : " de producción"}:\n${result.stderr || result.stdout}`);
  // Antes del JSON el CLI imprime líneas de estado ("Connecting to remote database...").
  const jsonLine = result.stdout.split("\n").reverse().find((line) => line.trim().startsWith("{"));
  if (!jsonLine) fail(`Respuesta inesperada de supabase migration list:\n${result.stdout}`);
  return JSON.parse(jsonLine).migrations;
}

function prodRef() {
  try {
    return readFileSync("supabase/.temp/project-ref", "utf8").trim();
  } catch {
    return fail("No hay proyecto de producción vinculado. Corre `supabase link` primero.");
  }
}

function stagingUrl() {
  const url = process.env.STAGING_DB_URL?.trim();
  if (!url) fail("Falta STAGING_DB_URL. Cópiala de Supabase (proyecto de staging → Connect) a .env.staging.");
  // El error más caro posible: que "staging" sea en realidad producción.
  if (url.includes(prodRef())) fail("STAGING_DB_URL apunta al proyecto de PRODUCCIÓN. Revisa .env.staging.");
  return url;
}

// Lo que venga después del destino (p. ej. --yes) pasa tal cual a `supabase db push`.
function push(args) {
  const result = spawnSync("supabase", ["db", "push", ...args, ...process.argv.slice(3)], { stdio: "inherit" });
  process.exit(result.status ?? 1);
}

function main() {
  const target = process.argv[2];

  if (target === "staging") {
    push(["--db-url", stagingUrl()]);
  } else if (target === "prod" || target === "status") {
    const staging = listMigrations(stagingUrl());
    const prod = listMigrations();
    const missing = missingInStaging(prod, staging);

    console.log(`Pendientes en staging:   ${pendingVersions(staging).join(", ") || "ninguna"}`);
    console.log(`Pendientes en producción: ${pendingVersions(prod).join(", ") || "ninguna"}`);
    if (target === "status") process.exit(0);

    if (missing.length > 0) {
      fail(`Producción necesita migraciones que staging todavía no tiene:\n  ${missing.join("\n  ")}\nAplícalas primero con \`npm run db:staging\` y pruébalas.`);
    }
    console.log(`\nAplicando a producción (proyecto ${prodRef()})...`);
    push([]);
  } else {
    fail("Uso: node scripts/db-push.mjs <staging|prod|status>");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
