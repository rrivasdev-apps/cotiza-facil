// Corre con: npm test
// Node 24 ejecuta el .ts directo (type stripping), por eso el import lleva extensión.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrice, parseTabular, parseConceptRows } from "../src/lib/concept-import.ts";

test("parsePrice: formatos latino, inglés y con moneda", () => {
  const cases = [
    ["1234.56", 1234.56],
    ["1.234,56", 1234.56],
    ["1,234.56", 1234.56],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["$ 1.500,00", 1500],
    ["Bs. 12", 12],
    ["USD 1,250.00", 1250],
    ["1.234.567", 1234567],
    ["0", 0],
  ];
  for (const [raw, expected] of cases) {
    const result = parsePrice(raw);
    assert.equal(result.error, null, raw);
    assert.equal(result.value, expected, raw);
  }
});

test("parsePrice: vacío es 'sin precio', no un error", () => {
  assert.deepEqual(parsePrice(""), { value: null, ambiguous: false, error: null });
  assert.deepEqual(parsePrice("   "), { value: null, ambiguous: false, error: null });
});

test("parsePrice: marca como ambiguo un único separador con 3 dígitos", () => {
  const dot = parsePrice("1.234");
  assert.equal(dot.value, 1234);
  assert.equal(dot.ambiguous, true);
  const comma = parsePrice("1,234");
  assert.equal(comma.value, 1234);
  assert.equal(comma.ambiguous, true);
  assert.equal(parsePrice("12,50").ambiguous, false);
});

test("parsePrice: 4+ dígitos antes del separador es decimal, no miles", () => {
  const result = parsePrice("1234.567");
  assert.equal(result.value, 1234.567);
  assert.equal(result.ambiguous, false);
});

test("parsePrice: rechaza texto, negativos y separadores mal puestos", () => {
  for (const raw of ["abc", "-5", "1.2.3,4,5", "12,,5"]) {
    assert.notEqual(parsePrice(raw).error, null, raw);
  }
});

test("parseTabular: celdas entrecomilladas con saltos de línea y comillas", () => {
  const text = 'Logo\t"Diseño de logo\ncon 3 propuestas"\t100\r\nWeb\t"Dice ""hola"""\t200';
  assert.deepEqual(parseTabular(text), [
    ["Logo", "Diseño de logo\ncon 3 propuestas", "100"],
    ["Web", 'Dice "hola"', "200"],
  ]);
});

test("parseConceptRows: tres columnas sin encabezado = nombre corto, concepto, precio", () => {
  const rows = parseConceptRows("Logo\tDiseño de logotipo\t150\nWeb\tSitio web de 5 páginas\t1.200,50");
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => [row.shortName, row.concept, row.price, row.error]),
    [
      ["Logo", "Diseño de logotipo", 150, null],
      ["Web", "Sitio web de 5 páginas", 1200.5, null],
    ],
  );
});

test("parseConceptRows: dos columnas = concepto, precio", () => {
  const [row] = parseConceptRows("Sesión de fotos\t80");
  assert.equal(row.shortName, "");
  assert.equal(row.concept, "Sesión de fotos");
  assert.equal(row.price, 80);
});

test("parseConceptRows: el encabezado se omite y respeta el orden de columnas", () => {
  const rows = parseConceptRows("Precio\tConcepto\tNombre corto\n99\tDiseño de logotipo\tLogo");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].price, 99);
  assert.equal(rows[0].concept, "Diseño de logotipo");
  assert.equal(rows[0].shortName, "Logo");
  assert.equal(rows[0].line, 2);
});

test("parseConceptRows: filas en blanco se ignoran y los errores quedan por fila", () => {
  const rows = parseConceptRows("A\tUno\t10\n\n\t\t\nB\t\t20\nC\tTres\tabc");
  assert.equal(rows.length, 3);
  assert.equal(rows[0].error, null);
  assert.equal(rows[1].error, "Falta el concepto");
  assert.equal(rows[2].error, "Precio inválido");
});

test("parseConceptRows: recorta el nombre corto a 60 caracteres", () => {
  const [row] = parseConceptRows(`${"x".repeat(80)}\tConcepto\t5`);
  assert.equal(row.shortName.length, 60);
});

test("parseConceptRows: texto vacío no produce filas", () => {
  assert.deepEqual(parseConceptRows(""), []);
  assert.deepEqual(parseConceptRows("\n\n"), []);
});
