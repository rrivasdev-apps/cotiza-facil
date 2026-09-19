import { NextResponse } from "next/server";
import { generateAndStorePresupuestoPdf, createPresupuestoPdfSignedUrl, PdfGenerationError } from "@/lib/presupuestos/pdf";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { path } = await generateAndStorePresupuestoPdf(id);
    const url = await createPresupuestoPdfSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof PdfGenerationError) {
      const status = error.message === "No autenticado." ? 401 : error.message.includes("no encontrad") ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
