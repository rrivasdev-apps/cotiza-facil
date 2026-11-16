// Parser del texto que Excel / Google Sheets ponen en el portapapeles al
// copiar un rango: celdas separadas por tabulación, filas por salto de
// línea. Sin imports del proyecto a propósito — así lo cubre
// scripts/concept-import.test.mjs con `node --test`, sin bundler.

export const MAX_IMPORT_ROWS = 500;
export const MAX_SHORT_NAME_LENGTH = 60;
export const MAX_CONCEPT_LENGTH = 1000;

export type ParsedConceptRow = {
  line: number;
  shortName: string;
  concept: string;
  // null = sin precio (válido: el catálogo permite conceptos sin precio).
  price: number | null;
  // El texto del precio no permitía saber con certeza si "," o "." era
  // decimal o de miles (ej. "1.234") — la vista previa lo resalta para
  // que la persona confirme el valor antes de guardar.
  priceAmbiguous: boolean;
  error: string | null;
};

// Excel entrecomilla las celdas que tienen saltos de línea o tabulaciones
// (y duplica las comillas internas), así que un concepto largo en varias
// líneas llega como una sola celda y no como filas separadas.
export function parseTabular(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"' && cell === "") {
      inQuotes = true;
    } else if (char === "\t") {
      endCell();
    } else if (char === "\n") {
      endRow();
    } else if (char === "\r") {
      // \r\n: el \n siguiente cierra la fila; un \r suelto se ignora.
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) endRow();

  return rows;
}

export type ParsedPrice = { value: number | null; ambiguous: boolean; error: string | null };

// Acepta "1234.56", "1.234,56" (latino), "1,234.56" (inglés), "12,5" y
// símbolos/letras de moneda ("$", "Bs.", "USD"). Vacío = sin precio.
export function parsePrice(raw: string): ParsedPrice {
  // El punto de "Bs." o "US$." no es separador: se recortan los . y ,
  // sueltos de los extremos después de quitar letras y símbolos.
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/^[.,]+|[.,]+$/g, "");
  if (cleaned === "") {
    // "abc" no trae ningún dígito: es un error, no "sin precio".
    return raw.trim() === "" ? { value: null, ambiguous: false, error: null } : { value: null, ambiguous: false, error: "Precio inválido" };
  }
  if (cleaned.startsWith("-")) return { value: null, ambiguous: false, error: "El precio no puede ser negativo" };
  if (/[^\d.,]/.test(cleaned)) return { value: null, ambiguous: false, error: "Precio inválido" };

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let decimalSeparator: "." | "," | null = null;
  let ambiguous = false;

  if (lastDot !== -1 && lastComma !== -1) {
    // Con los dos presentes, el último es el decimal.
    decimalSeparator = lastDot > lastComma ? "." : ",";
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separator = lastDot !== -1 ? "." : ",";
    const occurrences = cleaned.split(separator).length - 1;
    const afterLast = cleaned.length - 1 - cleaned.lastIndexOf(separator);
    if (occurrences > 1) {
      // "1.234.567": un separador repetido solo puede ser de miles.
      decimalSeparator = null;
    } else if (afterLast === 3 && cleaned.indexOf(separator) <= 3) {
      // "1.234" / "1,234": con 3 dígitos tras el único separador no hay
      // forma de saber si es miles o decimal. Un precio con 3 decimales
      // es raro, así que se asume miles y se avisa.
      decimalSeparator = null;
      ambiguous = true;
    } else {
      decimalSeparator = separator;
    }
  }

  // Los miles solo valen en grupos de exactamente 3 dígitos ("1.234.567");
  // "12,,5" o "1.2.3" son errores de tipeo, no un precio de 125 ni de 123.
  const thousandsChar = decimalSeparator === "." ? "," : decimalSeparator === "," ? "." : null;
  const integerPart = decimalSeparator ? cleaned.slice(0, cleaned.lastIndexOf(decimalSeparator)) : cleaned;
  const groups = integerPart.split(thousandsChar ?? /[.,]/);
  const groupsAreValid =
    groups.length === 1 ||
    (groups[0].length >= 1 && groups[0].length <= 3 && groups.slice(1).every((group) => group.length === 3));
  if (!groupsAreValid) return { value: null, ambiguous: false, error: "Precio inválido" };

  let normalized = cleaned;
  if (decimalSeparator) {
    const thousands = decimalSeparator === "." ? "," : ".";
    normalized = normalized.split(thousands).join("").replace(decimalSeparator, ".");
  } else {
    normalized = normalized.replace(/[.,]/g, "");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || !/^\d+(\.\d+)?$/.test(normalized)) {
    return { value: null, ambiguous: false, error: "Precio inválido" };
  }
  return { value, ambiguous, error: null };
}

type ColumnRole = "shortName" | "concept" | "price";

function normalizeHeader(cell: string): string {
  return cell
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .trim();
}

function headerRole(cell: string): ColumnRole | null {
  const header = normalizeHeader(cell);
  if (/^(nombre|nombre corto|corto|alias|codigo|sku)$/.test(header)) return "shortName";
  if (/^(concepto|descripcion|detalle|producto|servicio|producto o servicio)$/.test(header)) return "concept";
  if (/^(precio|precio unitario|precio unit|monto|costo|valor|tarifa)$/.test(header)) return "price";
  return null;
}

// Con encabezado se respeta el orden de las columnas que traiga la
// hoja; sin encabezado se deduce por cantidad: 3 = nombre corto ·
// concepto · precio, 2 = concepto · precio, 1 = solo concepto.
function detectColumns(rows: string[][]): { roles: (ColumnRole | null)[]; hasHeader: boolean } {
  const first = rows[0] ?? [];
  const headerRoles = first.map(headerRole);
  const recognized = headerRoles.filter((role) => role !== null).length;
  if (recognized >= 2 && headerRoles.includes("concept")) {
    return { roles: headerRoles, hasHeader: true };
  }
  const width = Math.max(...rows.map((row) => row.length), 0);
  if (width >= 3) return { roles: ["shortName", "concept", "price"], hasHeader: false };
  if (width === 2) return { roles: ["concept", "price"], hasHeader: false };
  return { roles: ["concept"], hasHeader: false };
}

export function parseConceptRows(text: string): ParsedConceptRow[] {
  const rows = parseTabular(text).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) return [];

  const { roles, hasHeader } = detectColumns(rows);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const lineOffset = hasHeader ? 2 : 1;

  return dataRows.map((cells, index) => {
    const pick = (role: ColumnRole) => {
      const position = roles.indexOf(role);
      return position === -1 ? "" : (cells[position] ?? "").trim();
    };
    const concept = pick("concept");
    const shortName = pick("shortName").slice(0, MAX_SHORT_NAME_LENGTH);
    const price = parsePrice(pick("price"));

    let error = price.error;
    if (!concept) error = "Falta el concepto";
    else if (concept.length > MAX_CONCEPT_LENGTH) error = `El concepto supera ${MAX_CONCEPT_LENGTH} caracteres`;

    return {
      line: index + lineOffset,
      shortName,
      concept,
      price: price.value,
      priceAmbiguous: price.ambiguous,
      error,
    };
  });
}
