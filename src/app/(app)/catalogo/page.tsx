import { createClient } from "@/lib/supabase/server";
import type { FieldCatalogEntry } from "@/lib/types";
import { CatalogoList } from "./catalogo-list";
import { HelpButton } from "@/components/help-button";

const HELP_STEPS = [
  "Acá guardas los \"campos\" que después puedes usar en cualquier plantilla — por ejemplo, Ciudad, Teléfono o Condiciones de pago.",
  "Toca \"Agregar\" para crear un campo nuevo: ponle un nombre, escribe para qué sirve y elige qué tipo de dato es (texto, número, fecha, etc.).",
  "El ícono de lápiz de un campo lo abre para editarlo — cambia lo que necesites y toca \"Guardar\".",
  "El ícono de basurita borra un campo — solo se puede borrar si ninguna plantilla lo está usando todavía.",
];

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: fields } = await supabase.from("field_catalog").select("*").order("name");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Catálogo de campos</h1>
          <HelpButton title="Cómo usar el Catálogo" steps={HELP_STEPS} />
        </div>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
          Campos reutilizables para armar tus plantillas de presupuesto.
        </p>
      </div>
      <CatalogoList fields={(fields ?? []) as FieldCatalogEntry[]} />
    </div>
  );
}
