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

  const { data: page, error: pageError } = await admin
    .from("template_pages")
    .insert({ account_id: account.id, template_id: template.id, title: `Página ${tag}` })
    .select()
    .single();
  if (pageError) throw new Error(`crear template_page ${tag}: ${pageError.message}`);

  const { data: section, error: sectionError } = await admin
    .from("template_sections")
    .insert({ account_id: account.id, template_id: template.id, page_id: page.id, type: "texto_libre", title: `Seccion ${tag}` })
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

// Usuario sin workspace propio, colaborador en `accountId`.
async function seedCollaborator(tag, password, accountId) {
  const email = `rls-test-${tag}-${randomUUID().slice(0, 8)}@example.invalid`;

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(`crear usuario ${tag}: ${authError.message}`);

  const { error: userError } = await admin
    .from("users")
    .insert({ id: authUser.user.id, email, account_id: null, active_account_id: accountId });
  if (userError) throw new Error(`vincular usuario ${tag}: ${userError.message}`);

  const { error: memberError } = await admin
    .from("account_members")
    .insert({ user_id: authUser.user.id, account_id: accountId, role: "collaborator" });
  if (memberError) throw new Error(`crear membresía ${tag}: ${memberError.message}`);

  return { email, userId: authUser.user.id };
}

async function cleanup(a, b, collaboratorUser) {
  for (const acc of [a, b]) {
    if (!acc) continue;
    try {
      await admin.auth.admin.deleteUser(acc.userId);
    } catch {}
    try {
      await admin.from("accounts").delete().eq("id", acc.accountId);
    } catch {}
  }
  if (collaboratorUser) {
    try {
      await admin.auth.admin.deleteUser(collaboratorUser.userId);
    } catch {}
  }
}

let seededA, seededB, collaborator;

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

  // 6. Dueño sigue pudiendo escribir en su plantilla/catálogo.
  const { error: ownerInsertError } = await clientA
    .from("field_catalog")
    .insert({ account_id: seededA.accountId, name: "campo del dueño", data_type: "texto_corto" });
  check("Dueño A: INSERT field_catalog propio permitido", !ownerInsertError, ownerInsertError?.message ?? "OK");

  await clientA.auth.signOut();

  // 7. Colaborador C en el workspace de A (sin workspace propio).
  collaborator = await seedCollaborator("c", password, seededA.accountId);
  const clientC = createClient(url, anonKey);
  const { error: signInCError } = await clientC.auth.signInWithPassword({
    email: collaborator.email,
    password,
  });
  if (signInCError) throw new Error(`login C: ${signInCError.message}`);

  const { data: cPresupuestos, error: cReadError } = await clientC.from("presupuestos").select("*");
  check(
    "Colaborador C: lee presupuestos de A",
    !cReadError && cPresupuestos.some((row) => row.id === seededA.presupuestoId),
    cReadError?.message ?? `${cPresupuestos?.length ?? 0} filas`,
  );
  check(
    "Colaborador C: no ve presupuestos de B",
    !cPresupuestos?.some((row) => row.account_id === seededB.accountId),
    "sin filas de B",
  );

  const { error: cInsertPresupuestoError } = await clientC.from("presupuestos").insert({
    account_id: seededA.accountId,
    template_id: seededA.templateId,
    client_name: "Cliente de C",
    client_email: "cliente-c@example.invalid",
  });
  check("Colaborador C: crea presupuesto en A", !cInsertPresupuestoError, cInsertPresupuestoError?.message ?? "OK");

  const { data: cTemplates } = await clientC.from("templates").select("id").eq("id", seededA.templateId);
  check("Colaborador C: puede leer la plantilla de A", cTemplates?.length === 1, `${cTemplates?.length ?? 0} filas`);

  const { error: cFieldError } = await clientC
    .from("field_catalog")
    .insert({ account_id: seededA.accountId, name: "intruso colaborador", data_type: "texto_corto" });
  check("Colaborador C: INSERT field_catalog en A bloqueado", !!cFieldError, cFieldError ? cFieldError.message : "insertó");

  const { data: cTemplateUpdate, error: cTemplateUpdateError } = await clientC
    .from("templates")
    .update({ name: "hackeado por colaborador" })
    .eq("id", seededA.templateId)
    .select();
  check(
    "Colaborador C: UPDATE template de A bloqueado",
    !!cTemplateUpdateError || !cTemplateUpdate?.length,
    `filas afectadas: ${cTemplateUpdate?.length ?? 0}`,
  );

  const { data: cTemplateDelete, error: cTemplateDeleteError } = await clientC
    .from("templates")
    .delete()
    .eq("id", seededA.templateId)
    .select();
  check(
    "Colaborador C: DELETE template de A bloqueado",
    !!cTemplateDeleteError || !cTemplateDelete?.length,
    `filas afectadas: ${cTemplateDelete?.length ?? 0}`,
  );

  const { data: cAccountUpdate, error: cAccountUpdateError } = await clientC
    .from("accounts")
    .update({ name: "hackeado por colaborador" })
    .eq("id", seededA.accountId)
    .select();
  check(
    "Colaborador C: UPDATE accounts de A bloqueado",
    !!cAccountUpdateError || !cAccountUpdate?.length,
    `filas afectadas: ${cAccountUpdate?.length ?? 0}`,
  );

  // 8. Apuntar active_account_id a un workspace donde NO es miembro no
  // da acceso (la policy valida contra account_members). La columna la
  // escribe el service role, como hará setActiveAccount.
  await admin.from("users").update({ active_account_id: seededB.accountId }).eq("id", collaborator.userId);
  const { data: cForeign } = await clientC.from("presupuestos").select("*");
  check(
    "Colaborador C con active_account_id ajeno: no ve nada",
    (cForeign ?? []).length === 0,
    `${cForeign?.length ?? 0} filas`,
  );
  await clientC.auth.signOut();

  // 9. Límites de plan (triggers). La cuenta B nace en plan "gratis".
  const insertTemplate = () =>
    admin.from("templates").insert({ account_id: seededB.accountId, name: "extra" });
  const insertPresupuesto = () =>
    admin.from("presupuestos").insert({
      account_id: seededB.accountId,
      template_id: seededB.templateId,
      client_name: "Extra",
      client_email: "extra@example.invalid",
    });

  const { data: planRow } = await admin.from("accounts").select("plan").eq("id", seededB.accountId).single();
  check("Plan: una cuenta nueva nace en 'gratis'", planRow?.plan === "gratis", `plan=${planRow?.plan}`);

  const { error: secondTemplateError } = await insertTemplate();
  check("Plan gratis: 2ª plantilla bloqueada", !!secondTemplateError, secondTemplateError?.message ?? "insertó");

  let fifthOk = true;
  for (let i = 0; i < 4; i++) {
    const { error } = await insertPresupuesto();
    if (error) fifthOk = false;
  }
  check("Plan gratis: hasta 5 presupuestos permitidos", fifthOk, "los 4 extra (total 5) debían entrar");
  const { error: sixthError } = await insertPresupuesto();
  check("Plan gratis: 6º presupuesto bloqueado", !!sixthError, sixthError?.message ?? "insertó");

  await admin.from("accounts").update({ plan: "fundador" }).eq("id", seededB.accountId);
  const { error: founderTemplateError } = await insertTemplate();
  const { error: founderPresupuestoError } = await insertPresupuesto();
  check("Plan fundador: sin límites", !founderTemplateError && !founderPresupuestoError, `${founderTemplateError?.message ?? ""} ${founderPresupuestoError?.message ?? ""}`);

  // Pioneros vencido vuelve a comportarse como gratis (B ya supera los topes).
  await admin
    .from("accounts")
    .update({ plan: "pionero_mensual", plan_expires_at: new Date(Date.now() - 864e5).toISOString() })
    .eq("id", seededB.accountId);
  const { error: expiredError } = await insertPresupuesto();
  check("Plan Pioneros vencido: vuelve al tope de gratis", !!expiredError, expiredError?.message ?? "insertó");

  await admin
    .from("accounts")
    .update({ plan_expires_at: new Date(Date.now() + 864e5).toISOString() })
    .eq("id", seededB.accountId);
  const { error: activeError } = await insertPresupuesto();
  check("Plan Pioneros vigente: sin tope", !activeError, activeError?.message ?? "OK");
} finally {
  await cleanup(seededA, seededB, collaborator);
}

console.log("\n--- Resultado de aislamiento RLS ---\n");
for (const r of results) {
  console.log(`${r.pass ? "OK  " : "FAIL"}  ${r.label}${r.pass ? "" : `\n      ${r.detail}`}`);
}
console.log(`\n${ok ? "TODO OK: las cuentas están aisladas." : "HAY FUGAS: revisar policies antes de seguir."}\n`);

process.exit(ok ? 0 : 1);
