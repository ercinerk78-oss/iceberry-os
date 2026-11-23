import assert from "node:assert/strict";
import test from "node:test";
import { cutoverLine, remainingCount, CUTOVER_ORDERS, type CountImportRow } from "./stock-cutover-plan";

const row: CountImportRow = { row: 9, currentName: "Bubble", name: "Bubble", currentSku: "2241", sku: "079", supplier: "Firma", purchasePrice: "143.7", salePrice: "200", unit: "Adet", factor: 10, countedQuantity: 2190 };
test("cutover converts old packages once and reprices base quantities", () => {
  assert.deepEqual(cutoverLine(row, 2, CUTOVER_ORDERS[0]), { ordered: 20, shipped: 20, missing: 0, subtotal: 4000 });
  assert.equal(remainingCount(2190, 40, 0), 2150);
});
test("only the confirmed Rubby shortage is left outstanding", () => {
  const rubby = { ...row, currentSku: "4422", factor: 1 };
  assert.equal(cutoverLine(rubby, 1, CUTOVER_ORDERS[0]).shipped, 0);
  assert.equal(cutoverLine({ ...row, currentSku: "8888", factor: 1 }, 1, CUTOVER_ORDERS[0]).shipped, 1);
  assert.equal(cutoverLine({ ...row, currentSku: "6666", factor: 1 }, 1, CUTOVER_ORDERS[0]).shipped, 1);
});
test("cutover preserves other reservations and rejects negative stock", () => {
  assert.equal(remainingCount(5, 1, 2), 4);
  assert.throws(() => remainingCount(5, 4, 2));
  assert.throws(() => remainingCount(0, 1, 0));
  assert.throws(() => remainingCount(NaN, 0, 0));
  assert.equal(remainingCount(42, 10.5, 0), 31.5);
});
