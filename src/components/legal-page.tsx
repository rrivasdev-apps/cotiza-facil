import { PublicHeader } from "@/components/public-header";
import { LEGAL } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main className="legal-page">
        {LEGAL.isDraft && (
          <p className="legal-draft">
            Borrador pendiente de revisión legal: el texto puede cambiar antes de su versión definitiva.
          </p>
        )}
        <h1>{title}</h1>
        <p className="legal-updated">Última actualización: {LEGAL.lastUpdated}</p>
        {children}
      </main>
    </div>
  );
}
