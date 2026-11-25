import assert from "node:assert/strict";
import test from "node:test";
import { assertCountEditable, countItemSchema, stockCountProducts } from "./stock-count";

test("stock counts accept zero and fractional base quantities", () => {
  for (const quantity of [0, 42, 10.5]) assert.equal(countItemSchema.parse({ productId: "tea", quantity }).quantity, quantity);
  for (const quantity of [-1, Infinity, NaN]) assert.equal(countItemSchema.safeParse({ productId: "tea", quantity }).success, false);
});

test("draft counts list every product before searching and retain inactive saved products", () => {
  const products = [{ id: "a", name: "Adana Çayı", sku: "001", unit: "KG" }, { id: "b", name: "Bardak", sku: "002", unit: "Adet" }];
  const items = [{ productId: "c", name: "Çikolata", sku: "003", unit: "Adet", quantity: 0, expected: 5 }];
  assert.deepEqual(stockCountProducts(products, [], false).map(product => product.id), ["a", "b"]);
  assert.deepEqual(stockCountProducts(products, items, false).map(product => product.id), ["a", "b", "c"]);
  assert.deepEqual(stockCountProducts(products, items, true).map(product => product.id), ["c"]);
});
test("approved and legacy completed counts cannot be edited", () => {
  assert.doesNotThrow(() => assertCountEditable("DRAFT"));
  for (const status of ["APPROVED", "COMPLETED", "CANCELLED"]) assert.throws(() => assertCountEditable(status), /değiştirilemez/);
});
