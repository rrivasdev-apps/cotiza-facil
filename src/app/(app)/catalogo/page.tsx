import { createClient } from "@/lib/supabase/server";
import type { FieldCatalogEntry } from "@/lib/types";
import { CatalogoList } from "./catalogo-list";

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: fields } = await supabase.from("field_catalog").select("*").order("name");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>Catálogo de campos</h1>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
          Campos reutilizables para armar tus plantillas de presupuesto.
        </p>
      </div>
      <CatalogoList fields={(fields ?? []) as FieldCatalogEntry[]} />
    </div>
  );
}
