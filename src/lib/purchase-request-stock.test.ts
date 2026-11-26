import assert from "node:assert/strict";
import test from "node:test";
import { purchaseRequestStock } from "./purchase-request-stock";

test("request stock is the selected warehouse physical quantity, not a cross-warehouse total", () => {
  const product = { unit: "Adet", stocks: [{ warehouseId: "a", quantity: 1250 }, { warehouseId: "b", quantity: 42 }] };
  assert.equal(purchaseRequestStock(product, "a"), "1.250 Adet");
  assert.equal(purchaseRequestStock(product, "b"), "42 Adet");
  assert.equal(purchaseRequestStock(product, "c"), "0 Adet");
  assert.equal(product.stocks[0].quantity, 1250);
});

test("missing selections stay blank, real zero and fractional kilogram quantities remain distinct", () => {
  assert.equal(purchaseRequestStock(undefined, "a"), "");
  assert.equal(purchaseRequestStock({ unit: "Adet", stocks: [] }, ""), "");
  assert.equal(purchaseRequestStock({ unit: "Adet", stocks: [] }, "a"), "0 Adet");
  assert.equal(purchaseRequestStock({ unit: "kg", stocks: [{ warehouseId: "a", quantity: 10.5 }] }, "a"), "10,5 kg");
});
