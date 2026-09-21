// Convierte un monto a su forma escrita en español, formato factura:
// "CIENTO CINCUENTA Y OCHO CON 32/100". No lleva nombre de moneda
// (peso, dólar, etc.) porque el monto no sabe en qué moneda está —
// si hace falta, se agrega a mano en el nombre del campo catálogo.

const ONES = [
  "CERO", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE",
  "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE",
];

const TENS: Record<number, string> = {
  3: "TREINTA",
  4: "CUARENTA",
  5: "CINCUENTA",
  6: "SESENTA",
  7: "SETENTA",
  8: "OCHENTA",
  9: "NOVENTA",
};

const HUNDREDS: Record<number, string> = {
  1: "CIENTO",
  2: "DOSCIENTOS",
  3: "TRESCIENTOS",
  4: "CUATROCIENTOS",
  5: "QUINIENTOS",
  6: "SEISCIENTOS",
  7: "SETECIENTOS",
  8: "OCHOCIENTOS",
  9: "NOVECIENTOS",
};

function convertTens(n: number): string {
  if (n <= 29) return ONES[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  return unit === 0 ? TENS[tens] : `${TENS[tens]} Y ${ONES[unit]}`;
}

function convertHundreds(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const hundredWord = hundred > 0 ? HUNDREDS[hundred] : "";
  if (rest === 0) return hundredWord;
  const tensWord = convertTens(rest);
  return hundredWord ? `${hundredWord} ${tensWord}` : tensWord;
}

// "UNO"/"VEINTIUNO" se apocopan a "UN"/"VEINTIÚN" cuando modifican
// directamente a "MIL" o "MILLONES" (p. ej. "VEINTIÚN MIL", no
// "VEINTIUNO MIL") — no aplica al último grupo (0-999), que queda
// como número final ("CIENTO UNO").
function apocopateUno(words: string): string {
  if (words.endsWith("VEINTIUNO")) return `${words.slice(0, -"VEINTIUNO".length)}VEINTIÚN`;
  if (words.endsWith("UNO")) return `${words.slice(0, -3)}UN`;
  return words;
}

function integerToWordsEs(n: number): string {
  if (n === 0) return "CERO";
  if (n < 0) return `MENOS ${integerToWordsEs(-n)}`;

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (millions > 0) {
    parts.push(millions === 1 ? "UN MILLÓN" : `${apocopateUno(convertHundreds(millions))} MILLONES`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? "MIL" : `${apocopateUno(convertHundreds(thousands))} MIL`);
  }
  if (rest > 0) {
    parts.push(convertHundreds(rest));
  }

  return parts.join(" ");
}

export function numberToWordsEs(amount: number): string {
  if (!Number.isFinite(amount)) return "";

  const negative = amount < 0;
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const integerPart = Math.floor(rounded);
  const cents = Math.round((rounded - integerPart) * 100);

  const sign = negative ? "MENOS " : "";
  return `${sign}${integerToWordsEs(integerPart)} CON ${String(cents).padStart(2, "0")}/100`;
}
