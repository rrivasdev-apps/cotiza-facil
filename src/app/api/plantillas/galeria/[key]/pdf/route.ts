import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/account";
import { buildGalleryPreviewDocument } from "@/lib/templates/gallery-preview";
import { renderPresupuestoPdfHtml } from "@/lib/pdf/render-document";
import { htmlToPdf } from "@/lib/pdf/generate";

// PDF de ejemplo de una plantilla de galería — se genera al vuelo, en
// memoria, sin crear ni guardar nada (ni plantilla ni presupuesto) en
// ninguna cuenta. Solo pide sesión iniciada para no dejar la
// generación (cara: levanta Chromium) abierta a cualquiera.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let html: string;
  try {
    const { template, pages, catalogFields, presupuesto } = buildGalleryPreviewDocument(key);
    html = renderPresupuestoPdfHtml(presupuesto, template, pages, catalogFields);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plantilla de galería no encontrada.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await htmlToPdf(html);
  } catch (error) {
    console.error("Fallo generando el PDF de ejemplo de galería:", error);
    return NextResponse.json({ error: "No se pudo generar el PDF de ejemplo." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ejemplo-${key}.pdf"`,
    },
  });
}
