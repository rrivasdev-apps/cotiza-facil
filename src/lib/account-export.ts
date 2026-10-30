import { strToU8, zipSync } from "fflate";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

// Supabase corta cada consulta en 1.000 filas sin avisar; sin paginar, una
// cuenta grande se exportaría incompleta y nadie lo notaría.
const PAGE_SIZE = 1000;

// Tablas de la cuenta que se exportan tal cual. Se leen con el cliente de la
// sesión (RLS) además del filtro explícito por cuenta. No incluye
// integrations: guarda secretos cifrados que no tiene sentido entregar.
const ACCOUNT_TABLES = [
  "templates",
  "template_pages",
  "template_sections",
  "template_section_fields",
  "field_catalog",
  "field_saved_values",
  "item_concept_values",
  "clientes",
  "presupuestos",
] as const;

async function fetchAll(client: SupabaseClient, table: string, accountId: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("account_id", accountId)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

// Los textos que empiezan con = @ (o + - que no parezcan un teléfono) los
// interpreta Excel como fórmula: un cliente llamado "=HYPERLINK(...)" se
// ejecutaría al abrir el CSV. El apóstrofo lo neutraliza.
function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=@\t\r]/.test(text)) text = `'${text}`;
  else if (typeof value === "string" && /^[+-]/.test(text) && !/^[+-][\d\s().-]*$/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// El BOM inicial hace que Excel lea bien las tildes y las ñ.
function toCsv(columns: { header: string; key: string }[], rows: Row[]): string {
  const lines = [columns.map((column) => csvCell(column.header)).join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column.key])).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

const CLIENT_COLUMNS = [
  { header: "Nombre", key: "name" },
  { header: "Correo", key: "email" },
  { header: "Teléfono", key: "phone" },
  { header: "Dirección", key: "address" },
  { header: "Creado", key: "created_at" },
];

const PRESUPUESTO_COLUMNS = [
  { header: "N°", key: "number" },
  { header: "Cliente", key: "client_name" },
  { header: "Correo del cliente", key: "client_email" },
  { header: "Estado", key: "status" },
  { header: "Total", key: "total_amount" },
  { header: "Creado", key: "created_at" },
  { header: "Enviado", key: "sent_at" },
  { header: "Aprobado", key: "approved_at" },
  { header: "Rechazado", key: "rejected_at" },
];

const README = `Copia de tus datos de Cotiza Fácil

clientes.csv         Tus clientes. Se abre con Excel o Google Sheets.
presupuestos.csv     Resumen de tus presupuestos (cliente, estado, total, fechas).
datos-completos.json Todo lo demás, con el detalle completo: plantillas, páginas,
                     secciones y campos, catálogo de campos, valores y conceptos
                     guardados, y el contenido de cada presupuesto.

No incluye los PDF (puedes volver a generarlos desde cada presupuesto), tu
contraseña, ni las claves de tus integraciones.
`;

export async function buildAccountExport(
  client: SupabaseClient,
  accountId: string,
  // Compras registradas a nombre de esta cuenta: solo el service role las lee
  // (plan_activations no tiene policies), por eso llegan por un cliente aparte.
  adminClient: SupabaseClient,
): Promise<Uint8Array> {
  const tables: Record<string, Row[]> = {};
  for (const table of ACCOUNT_TABLES) tables[table] = await fetchAll(client, table, accountId);

  const { data: account, error: accountError } = await client.from("accounts").select("*").eq("id", accountId).single();
  if (accountError) throw new Error(`No se pudo leer la cuenta: ${accountError.message}`);

  const { data: members, error: membersError } = await client
    .from("account_members")
    .select("role, created_at, users(email)")
    .eq("account_id", accountId);
  if (membersError) throw new Error(`No se pudo leer los miembros: ${membersError.message}`);

  const { data: purchases, error: purchasesError } = await adminClient
    .from("plan_activations")
    .select("created_at, email, plan, status, note")
    .eq("account_id", accountId);
  if (purchasesError) throw new Error(`No se pudo leer las compras: ${purchasesError.message}`);

  const everything = {
    exported_at: new Date().toISOString(),
    account,
    members: (members ?? []).map((member) => ({
      email: (member.users as unknown as { email: string } | null)?.email ?? null,
      role: member.role,
      since: member.created_at,
    })),
    purchases: purchases ?? [],
    ...tables,
  };

  return zipSync({
    "LEEME.txt": strToU8(README),
    "clientes.csv": strToU8(toCsv(CLIENT_COLUMNS, tables.clientes)),
    "presupuestos.csv": strToU8(toCsv(PRESUPUESTO_COLUMNS, tables.presupuestos)),
    "datos-completos.json": strToU8(JSON.stringify(everything, null, 2)),
  });
}
