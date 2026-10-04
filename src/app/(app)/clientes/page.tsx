import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";
import { ClientesList } from "./clientes-list";
import { HelpButton } from "@/components/help-button";

const HELP_STEPS = [
  "Acá guardas tus clientes — nombre, correo, teléfono y dirección — para no volver a escribirlos cada vez que haces un presupuesto nuevo.",
  "El correo es obligatorio y tiene que ser distinto para cada cliente — así la app sabe que es \"el mismo\" la próxima vez.",
  "Toca \"Agregar\" para guardar uno nuevo, o créalo directo desde \"Nuevo presupuesto\" si todavía no lo tienes acá.",
  "El ícono de lápiz edita un cliente; el de basurita lo borra — borrarlo no afecta a los presupuestos que ya le hiciste, esos quedan igual que antes.",
];

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase.from("clientes").select("*").order("name");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Clientes</h1>
          <HelpButton title="Cómo usar Clientes" steps={HELP_STEPS} />
        </div>
        <p style={{ color: "var(--ink-dim)", fontSize: "0.875rem" }}>
          Tus clientes, para elegirlos al vuelo al hacer un presupuesto nuevo.
        </p>
      </div>
      <ClientesList clientes={(clientes ?? []) as Cliente[]} />
    </div>
  );
}
