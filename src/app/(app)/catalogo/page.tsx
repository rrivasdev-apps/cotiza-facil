import { createClient } from "@/lib/supabase/server";
import type { FieldCatalogEntry } from "@/lib/types";
import { CatalogoList } from "./catalogo-list";

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: fields } = await supabase.from("field_catalog").select("*").order("name");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Catálogo de campos</h1>
      <CatalogoList fields={(fields ?? []) as FieldCatalogEntry[]} />
    </div>
  );
}
