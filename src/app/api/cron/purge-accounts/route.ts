import { NextResponse } from "next/server";
import { purgeDueAccounts } from "@/lib/account-deletion/purge-due";

// Lo llama Vercel Cron una vez al día (ver vercel.json) con
// "Authorization: Bearer <CRON_SECRET>", igual que /api/crm/retry.
// Cada cuenta borra archivos, usuarios y datos, así que se deja margen.
export const maxDuration = 60;

export async function GET(request: Request) {
  // Sin el chequeo de !secret, un CRON_SECRET ausente dejaría pasar a
  // quien mandara "Bearer undefined".
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.json(await purgeDueAccounts());
}
