import type { DataType, FieldCatalogEntry, PresupuestoData } from "@/lib/types";

// Formato guardado en DB: texto libre con tokens {{id:<x>}} — usa el id
// (no el nombre) para que renombrar un campo del catálogo no rompa una
// línea combinada (o fórmula, ver src/lib/formula.ts) ya guardada. <x>
// suele ser el uuid de un field_catalog, pero también puede ser el id
// sintético de un "Total General" de tabla_items (ver
// sectionTotalFieldId en presupuesto-items.ts) — de ahí que no se
// valide como uuid estricto, alcanza con que no tenga "{{"/"}}".
export const ID_TOKEN_RE = /\{\{id:([^{}]+)\}\}/g;

// Formato que ve el usuario al editar: los mismos tokens pero con el
// nombre del campo en vez del id, ej: "Son: {{Monto en letras}}".
const NAME_TOKEN_RE = /\{\{([^{}]+)\}\}/g;

// Versión en texto plano (sin HTML/React) de cada tipo de dato, para
// interpolar dentro de una línea de texto libre — misma lógica que
// formatFieldValue/formatValue pero sin envolver en tags.
export function formatFieldPlain(raw: string | string[] | undefined, dataType: DataType): string {
  if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) return "—";

  const value = Array.isArray(raw) ? raw.join(", ") : raw;

  if (dataType === "moneda") {
    const num = Number(value);
    return Number.isFinite(num) ? `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : value;
  }

  if (dataType === "fecha" && value) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-AR");
  }

  return value;
}

// Reemplaza cada {{id:<uuid>}} por el valor formateado de ese campo en
// este presupuesto. Un id que no matchea ningún campo del template (por
// ejemplo, el campo fuente se borró) se reemplaza por nada, no rompe el
// texto alrededor.
export function renderCompositeTemplate(
  template: string,
  data: PresupuestoData,
  fieldsById: Map<string, FieldCatalogEntry>,
): string {
  return template.replace(ID_TOKEN_RE, (_match, fieldId: string) => {
    const field = fieldsById.get(fieldId);
    if (!field) return "";
    return formatFieldPlain(data[fieldId], field.data_type);
  });
}

// Para mostrar el template guardado (con ids) como texto editable (con
// nombres) en el formulario de Estructura.
export function templateToDisplay(template: string, fieldsById: Map<string, FieldCatalogEntry>): string {
  return template.replace(ID_TOKEN_RE, (_match, fieldId: string) => `{{${fieldsById.get(fieldId)?.name ?? "?"}}}`);
}

// Inverso: lo que el usuario escribió (con nombres) vuelve a guardarse
// con ids. Si escribió un nombre que no existe en la plantilla, se
// devuelve un error en vez de guardar un token roto.
export function displayToTemplate(
  display: string,
  fieldsByName: Map<string, FieldCatalogEntry>,
): { template: string } | { error: string } {
  let error: string | null = null;
  const template = display.replace(NAME_TOKEN_RE, (fullMatch, name: string) => {
    const field = fieldsByName.get(name.trim());
    if (!field) {
      error = `No existe un campo llamado "${name.trim()}" en esta plantilla.`;
      return fullMatch;
    }
    return `{{id:${field.id}}}`;
  });
  if (error) return { error };
  return { template };
}
