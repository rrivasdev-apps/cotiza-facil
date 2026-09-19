// Prueba de aislamiento de RLS: crea dos cuentas descartables, intenta
// leer/escribir cruzado entre ellas con cada usuario autenticado, y
// reporta pass/fail por tabla. Limpia todo al final (ok o error).
//
// Uso:
//   node --env-file=.env.local scripts/verify-rls-isolation.mjs

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const admin = createClient(url, serviceKey);
const results = [];
let ok = true;

function check(label, pass, detail) {
  results.push({ label, pass, detail });
  if (!pass) ok = false;
}

async function seedAccount(tag, password) {
  const email = `rls-test-${tag}-${randomUUID().slice(0, 8)}@example.invalid`;

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .insert({ name: `RLS Test ${tag}` })
    .select()
    .single();
  if (accountError) throw new Error(`crear cuenta ${tag}: ${accountError.message}`);

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(`crear usuario ${tag}: ${authError.message}`);

  const { error: userError } = await admin.from("users").insert({
    id: authUser.user.id,
    account_id: account.id,
    email,
  });
  if (userError) throw new Error(`vincular usuario ${tag}: ${userError.message}`);

  const { data: field, error: fieldError } = await admin
    .from("field_catalog")
    .insert({ account_id: account.id, name: `Campo ${tag}`, data_type: "texto_corto" })
    .select()
    .single();
  if (fieldError) throw new Error(`crear field_catalog ${tag}: ${fieldError.message}`);

  const { data: template, error: templateError } = await admin
    .from("templates")
    .insert({ account_id: account.id, name: `Plantilla ${tag}` })
    .select()
    .single();
  if (templateError) throw new Error(`crear template ${tag}: ${templateError.message}`);

  const { data: section, error: sectionError } = await admin
    .from("template_sections")
    .insert({ account_id: account.id, template_id: template.id, type: "texto_libre", title: `Seccion ${tag}` })
    .select()
    .single();
  if (sectionError) throw new Error(`crear template_section ${tag}: ${sectionError.message}`);

  const { data: sectionField, error: sectionFieldError } = await admin
    .from("template_section_fields")
    .insert({ account_id: account.id, section_id: section.id, field_catalog_id: field.id })
    .select()
    .single();
  if (sectionFieldError) throw new Error(`crear template_section_field ${tag}: ${sectionFieldError.message}`);

  const { data: presupuesto, error: presupuestoError } = await admin
    .from("presupuestos")
    .insert({
      account_id: account.id,
      template_id: template.id,
      client_name: `Cliente ${tag}`,
      client_email: `cliente-${tag}@example.invalid`,
    })
    .select()
    .single();
  if (presupuestoError) throw new Error(`crear presupuesto ${tag}: ${presupuestoError.message}`);

  return {
    tag,
    email,
    password,
    userId: authUser.user.id,
    accountId: account.id,
    fieldId: field.id,
    templateId: template.id,
    sectionId: section.id,
    sectionFieldId: sectionField.id,
    presupuestoId: presupuesto.id,
  };
}

async function cleanup(a, b) {
  for (const acc of [a, b]) {
    if (!acc) continue;
    try {
      await admin.auth.admin.deleteUser(acc.userId);
    } catch {}
    try {
      await admin.from("accounts").delete().eq("id", acc.accountId);
    } catch {}
  }
}

let seededA, seededB;

try {
  const password = randomUUID();
  seededA = await seedAccount("a", password);
  seededB = await seedAccount("b", password);

  const clientA = createClient(url, anonKey);
  const { error: signInError } = await clientA.auth.signInWithPassword({
    email: seededA.email,
    password: seededA.password,
  });
  if (signInError) throw new Error(`login A: ${signInError.message}`);

  // 1. SELECT sin filtro en cada tabla: no debe aparecer nada de B.
  const tables = ["accounts", "users", "field_catalog", "templates", "template_sections", "template_section_fields", "presupuestos"];
  for (const table of tables) {
    const { data, error } = await clientA.from(table).select("*");
    if (error) {
      check(`SELECT ${table} (sin filtro) no rompe`, false, error.message);
      continue;
    }
    const leaked = data.some((row) => row.account_id === seededB.accountId || (table === "accounts" && row.id === seededB.accountId));
    check(`SELECT ${table}: A no ve filas de B`, !leaked, leaked ? `filas de B visibles: ${JSON.stringify(data)}` : `${data.length} filas, todas de A`);
  }

  // 2. SELECT directo por id de fila de B (bypass de filtro por account_id).
  const directReads = [
    ["templates", seededB.templateId],
    ["field_catalog", seededB.fieldId],
    ["template_sections", seededB.sectionId],
    ["template_section_fields", seededB.sectionFieldId],
    ["presupuestos", seededB.presupuestoId],
  ];
  for (const [table, id] of directReads) {
    const { data, error } = await clientA.from(table).select("*").eq("id", id);
    if (error) {
      check(`SELECT ${table} por id de B no rompe`, false, error.message);
      continue;
    }
    check(`SELECT ${table} por id de B: vacío`, data.length === 0, data.length ? `devolvió: ${JSON.stringify(data)}` : "vacío, OK");
  }

  // 3. UPDATE de una fila de B, como A.
  const { data: updateData, error: updateError } = await clientA
    .from("templates")
    .update({ name: "hackeado" })
    .eq("id", seededB.templateId)
    .select();
  const updateBlocked = !updateError && (!updateData || updateData.length === 0);
  check("UPDATE template de B como A: bloqueado", updateBlocked || !!updateError, updateError ? updateError.message : `filas afectadas: ${updateData?.length ?? 0}`);

  // 4. INSERT en cuenta de B, como A (probando el with check).
  const { data: insertData, error: insertError } = await clientA
    .from("field_catalog")
    .insert({ account_id: seededB.accountId, name: "intruso", data_type: "texto_corto" })
    .select();
  check("INSERT en cuenta de B como A: bloqueado", !!insertError, insertError ? insertError.message : `insertó: ${JSON.stringify(insertData)}`);

  // 5. DELETE de una fila de B, como A.
  const { data: deleteData, error: deleteError } = await clientA
    .from("presupuestos")
    .delete()
    .eq("id", seededB.presupuestoId)
    .select();
  const deleteBlocked = !deleteError && (!deleteData || deleteData.length === 0);
  check("DELETE presupuesto de B como A: bloqueado", deleteBlocked || !!deleteError, deleteError ? deleteError.message : `filas afectadas: ${deleteData?.length ?? 0}`);

  await clientA.auth.signOut();
} finally {
  await cleanup(seededA, seededB);
}

console.log("\n--- Resultado de aislamiento RLS ---\n");
for (const r of results) {
  console.log(`${r.pass ? "OK  " : "FAIL"}  ${r.label}${r.pass ? "" : `\n      ${r.detail}`}`);
}
console.log(`\n${ok ? "TODO OK: las cuentas están aisladas." : "HAY FUGAS: revisar policies antes de seguir."}\n`);

process.exit(ok ? 0 : 1);
