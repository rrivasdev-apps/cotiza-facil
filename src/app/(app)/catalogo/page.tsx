import { createClient } from "@/lib/supabase/server";
import { requireOwnerPage } from "@/lib/auth-guards";
import type { FieldCatalogEntry, ItemConceptValue } from "@/lib/types";
import { CatalogoList } from "./catalogo-list";
import { ProductosList } from "./productos-list";
import { CatalogoTabs } from "./catalogo-tabs";
import { HelpButton } from "@/components/help-button";

const HELP_STEPS = [
  "\"Campos\" son los que después puedes usar en cualquier plantilla — por ejemplo, Ciudad, Teléfono o Condiciones de pago.",
  "Toca \"Agregar\" para crear un campo nuevo: ponle un nombre, escribe para qué sirve y elige qué tipo de dato es (texto, número, fecha, etc.).",
  "Si marcas la casilla \"Permitir valores guardados\", cuando llenes ese campo en un presupuesto nuevo vas a poder guardar lo que escribiste y, la próxima vez, elegirlo de una lista en vez de volver a escribirlo.",
  "\"Productos\" es el catálogo de ítems con precio que se usan en una tabla de ítems (cantidad × precio) — es el mismo que se ve con \"Usar guardado\" al cargar un presupuesto, pero acá los puedes ver todos juntos y cargar uno nuevo sin tener que pasar primero por un presupuesto.",
  "El ícono de lápiz de una fila la abre para editarla — cambia lo que necesites y toca \"Guardar\". El de basurita la borra.",
];

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireOwnerPage();
  const { tab } = await searchParams;
  const activeTab = tab === "productos" ? "productos" : "campos";

  const supabase = await createClient();
  const [{ data: fields }, { data: concepts }] = await Promise.all([
    supabase.from("field_catalog").select("*").order("name"),
    supabase.from("item_concept_values").select("*").order("value"),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Catálogo</h1>
          <HelpButton title="Cómo usar el Catálogo" steps={HELP_STEPS} />
        </div>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
          {activeTab === "campos"
            ? "Campos reutilizables para armar tus plantillas de presupuesto."
            : "Productos y servicios con precio, reutilizables en la tabla de ítems de un presupuesto."}
        </p>
      </div>

      <CatalogoTabs active={activeTab} />

      {activeTab === "campos" ? (
        <CatalogoList fields={(fields ?? []) as FieldCatalogEntry[]} />
      ) : (
        <ProductosList concepts={(concepts ?? []) as ItemConceptValue[]} />
      )}
    </div>
  );
}
