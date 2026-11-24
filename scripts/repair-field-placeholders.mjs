// Repara las líneas combinadas (cierre / cláusulas / texto libre) de
// plantillas ya creadas desde la galería que quedaron con el placeholder
// literal "{{FIELD:Nombre}}" en vez de "{{id:<uuid>}}" (bug de
// createTemplateFromGallery, corregido para plantillas nuevas).
//
// Por defecto NO escribe nada: muestra qué cambiaría (dry-run). Con --apply
// guarda primero un respaldo JSON de las filas que va a tocar y luego las
// actualiza.
//
// Uso (staging, por defecto con .env.local):
//   node --env-file=.env.local scripts/repair-field-placeholders.mjs
//   node --env-file=.env.local scripts/repair-field-placeholders.mjs --apply
// Producción (solo después de probar en staging):
//   node --env-file=.env.prod.backup scripts/repair-field-placeholders.mjs --allow-prod
//   node --env-file=.env.prod.backup scripts/repair-field-placeholders.mjs --allow-prod --apply

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";

// Mismo id de producción que protege db-push.mjs: si la URL lo contiene, se
// exige --allow-prod para que correrlo contra producción nunca sea un descuido.
const PRODUCTION_PROJECT_ID = "iyvvozkhhrjhdzekrduu";

const FIELD_TOKEN = /\{\{FIELD:([^{}]+)\}\}/g;

// Reemplaza cada {{FIELD:nombre}} por {{id:uuid}} según `idByName`.
// Devuelve null si algún campo no se puede resolver o si quedan referencias
// por índice de sección ({{SECTION_TOTAL:n}}): ese índice depende del orden
// original de la galería, que el usuario pudo haber cambiado después, así que
// adivinarlo podría apuntar al total equivocado. En esos casos no se toca la
// línea y se reporta.
export function repairCompositeText(text, idByName) {
  if (/\{\{SECTION_TOTAL:\d+\}\}/.test(text)) return { text: null, reason: "referencia un total de sección por índice" };
  const missing = [];
  const repaired = text.replace(FIELD_TOKEN, (_match, name) => {
    const id = idByName.get(name.trim());
    if (!id) {
      missing.push(name.trim());
      return _match;
    }
    return `{{id:${id}}}`;
  });
  if (missing.length > 0) return { text: null, reason: `campo no encontrado en el catálogo: ${missing.join(", ")}` };
  return { text: repaired, reason: null };
}

function parseFlags(argv) {
  return { apply: argv.includes("--apply"), allowProd: argv.includes("--allow-prod") };
}

async function fetchAll(buildQuery) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function main() {
  const { apply, allowProd } = parseFlags(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }
  const isProduction = url.includes(PRODUCTION_PROJECT_ID);
  if (isProduction && !allowProd) {
    console.error("Esto apunta a PRODUCCIÓN. Pruébalo primero en staging; si ya lo hiciste, agrega --allow-prod.");
    process.exit(1);
  }
  console.log(`Entorno: ${isProduction ? "PRODUCCIÓN" : "staging/otro"} — modo: ${apply ? "APLICAR" : "solo mostrar (dry-run)"}`);

  const admin = createClient(url, serviceKey);

  const broken = await fetchAll(() =>
    admin
      .from("template_section_fields")
      .select("id, account_id, section_id, composite_template")
      .like("composite_template", "%{{FIELD:%")
      .order("id"),
  );
  if (broken.length === 0) {
    console.log("No hay líneas con {{FIELD:…}} literal. Nada que reparar.");
    return;
  }

  const accountIds = [...new Set(broken.map((row) => row.account_id))];
  const catalog = await fetchAll(() =>
    admin.from("field_catalog").select("id, account_id, name").in("account_id", accountIds).order("id"),
  );
  const idByAccountAndName = new Map();
  for (const entry of catalog) {
    const key = `${entry.account_id}|${entry.name}`;
    // Si hubiera dos campos con el mismo nombre en la cuenta, gana el primero:
    // la galería reutiliza por nombre, así que es el que usó al crear.
    if (!idByAccountAndName.has(key)) idByAccountAndName.set(key, entry.id);
  }

  const toUpdate = [];
  const skipped = [];
  for (const row of broken) {
    const idByName = new Map();
    for (const entry of catalog) {
      if (entry.account_id === row.account_id && idByAccountAndName.get(`${entry.account_id}|${entry.name}`) === entry.id) {
        idByName.set(entry.name, entry.id);
      }
    }
    const result = repairCompositeText(row.composite_template, idByName);
    if (result.text === null) skipped.push({ row, reason: result.reason });
    else toUpdate.push({ row, repaired: result.text });
  }

  console.log(`\nLíneas con placeholder literal: ${broken.length}`);
  console.log(`  Reparables: ${toUpdate.length}`);
  console.log(`  Sin arreglo automático: ${skipped.length}`);
  for (const { row, repaired } of toUpdate) {
    console.log(`\n  [${row.id}] cuenta ${row.account_id}\n    antes:   ${row.composite_template}\n    después: ${repaired}`);
  }
  for (const { row, reason } of skipped) {
    console.log(`\n  [${row.id}] cuenta ${row.account_id} — NO se toca (${reason})\n    ${row.composite_template}`);
  }

  if (!apply) {
    console.log("\nDry-run: no se escribió nada. Agrega --apply para aplicar.");
    return;
  }
  if (toUpdate.length === 0) return;

  // Respaldo antes de escribir: permite volver al texto original fila por fila.
  mkdirSync(".repair-backups", { recursive: true });
  const backupPath = `.repair-backups/field-placeholders-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(backupPath, JSON.stringify(toUpdate.map(({ row }) => row), null, 2));
  console.log(`\nRespaldo guardado en ${backupPath}`);

  let updated = 0;
  let failed = 0;
  for (const { row, repaired } of toUpdate) {
    // El filtro por el texto original evita pisar una edición que el cliente
    // haya hecho entre la lectura y la escritura.
    const { data, error } = await admin
      .from("template_section_fields")
      .update({ composite_template: repaired })
      .eq("id", row.id)
      .eq("composite_template", row.composite_template)
      .select("id");
    if (error) {
      // Un fallo en una fila (p. ej. un bloqueo de red) no debe dejar sin
      // intentar las demás; se reporta al final y se puede volver a correr.
      const shortMessage = error.message.trimStart().startsWith("<") ? "respuesta HTML (bloqueo de red/Cloudflare)" : error.message;
      console.error(`Falló la fila ${row.id}: ${shortMessage}`);
      failed += 1;
      continue;
    }
    if (data.length > 0) updated += 1;
  }
  console.log(`Filas actualizadas: ${updated} de ${toUpdate.length}.`);
  if (failed > 0) {
    console.error(`${failed} fila(s) fallaron: vuelve a correr el script (es seguro repetirlo).`);
    process.exit(1);
  }
}

// Solo corre main() cuando se ejecuta directo, no al importarlo desde el test.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
