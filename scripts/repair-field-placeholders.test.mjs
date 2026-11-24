// Corre con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { repairCompositeText } from "./repair-field-placeholders.mjs";

const ids = new Map([
  ["Producto", "11111111-1111-1111-1111-111111111111"],
  ["Detalle", "22222222-2222-2222-2222-222222222222"],
]);

test("reemplaza cada {{FIELD:}} por su {{id:}}", () => {
  const result = repairCompositeText("{{FIELD:Producto}} — {{FIELD:Detalle}}", ids);
  assert.equal(result.text, "{{id:11111111-1111-1111-1111-111111111111}} — {{id:22222222-2222-2222-2222-222222222222}}");
});

test("no toca la línea si falta un campo en el catálogo", () => {
  const result = repairCompositeText("{{FIELD:Producto}} {{FIELD:Inexistente}}", ids);
  assert.equal(result.text, null);
  assert.match(result.reason, /Inexistente/);
});

test("no adivina {{SECTION_TOTAL:n}}", () => {
  const result = repairCompositeText("Total {{SECTION_TOTAL:1}} de {{FIELD:Producto}}", ids);
  assert.equal(result.text, null);
});
