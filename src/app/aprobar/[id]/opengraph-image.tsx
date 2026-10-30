import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { isApprovalLinkExpired } from "@/lib/presupuestos/approval-link";

// Vista previa del link de aprobación (WhatsApp, etc.): logo de Cotiza
// Fácil chico arriba a la izquierda y el de la empresa dueña del
// presupuesto al centro. Reemplaza al opengraph-image.png global solo
// en esta ruta.
export const alt = "Presupuesto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori solo renderiza PNG/JPEG/GIF de forma fiable; un logo en otro
// formato (webp, svg) rompería toda la imagen, así que lo descartamos
// y mostramos el nombre de la plantilla en su lugar.
const SUPPORTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/gif"];

async function fetchLogoAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !SUPPORTED_LOGO_TYPES.includes(mimeType)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${mimeType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: found } = await admin
    .from("presupuestos")
    .select("template_id, status, approval_expires_at")
    .eq("id", id)
    .single();
  // Con el enlace vencido la imagen queda genérica, igual que el título.
  const presupuesto = found && !isApprovalLinkExpired(found.status, found.approval_expires_at) ? found : null;
  const { data: template } = presupuesto
    ? await admin.from("templates").select("name, theme").eq("id", presupuesto.template_id).single()
    : { data: null };

  const companyLogoUrl = (template?.theme as { logoPath?: string | null } | null)?.logoPath ?? null;
  const companyLogo = companyLogoUrl ? await fetchLogoAsDataUri(companyLogoUrl) : null;

  const brandLogoBytes = await readFile(path.join(process.cwd(), "public", "logo-horizontal.png"));
  const brandLogo = `data:image/png;base64,${brandLogoBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          padding: 48,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brandLogo} alt="Cotiza Fácil" width={240} height={80} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companyLogo} alt="" style={{ maxWidth: 760, maxHeight: 380, objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 88, fontWeight: 700, color: "#0b2a55", textAlign: "center" }}>
              {template?.name ?? "Tu presupuesto"}
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
