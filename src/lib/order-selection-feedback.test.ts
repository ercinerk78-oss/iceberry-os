import assert from "node:assert/strict";
import test from "node:test";
import { orderSelectionQuantity } from "./order-selection-feedback";
import { changeOrderQuantity } from "./order-quantity";

test("selection shows both sales packages and base units without changing quantities", () => {
  assert.equal(orderSelectionQuantity(20, 10, "adet"), "2 koli / paket · 20 adet");
  assert.equal(orderSelectionQuantity(2500, 2500, "adet"), "1 koli / paket · 2.500 adet");
  assert.equal(orderSelectionQuantity(42, 10.5, "kg"), "4 koli / paket · 42 kg");
  assert.equal(orderSelectionQuantity(3, 1, "adet"), "3 adet");
  assert.equal(orderSelectionQuantity(5, 10, "adet"), "0,5 koli / paket · 5 adet");
  assert.equal(orderSelectionQuantity(0, 10, "adet"), "0 koli / paket · 0 adet");
});

test("repeated additions retain every click and kilogram precision", () => {
  let quantity = 0;
  for (let i = 0; i < 20; i++) quantity = changeOrderQuantity(quantity, 10.5);
  assert.equal(quantity, 210);
  assert.equal(orderSelectionQuantity(quantity, 10.5, "kg"), "20 koli / paket · 210 kg");
});
