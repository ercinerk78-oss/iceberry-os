import assert from "node:assert/strict";
import test from "node:test";
import { changeOrderQuantity, salesUnitFactor, toBaseQuantity } from "./order-quantity";

test("manual package additions use the configured base quantity", () => {
  assert.equal(toBaseQuantity(2, 10), 20);
  assert.equal(toBaseQuantity(1, 2500), 2500);
  assert.equal(toBaseQuantity(4, 10.5), 42);
  assert.equal(changeOrderQuantity(10, 10), 20);
});

test("individual quantities and fractional kilograms remain independent of packages", () => {
  assert.equal(toBaseQuantity(3, 1), 3);
  assert.equal(toBaseQuantity(0.25, 1), 0.25);
  assert.equal(changeOrderQuantity(0.3, -0.1), 0.2);
  assert.equal(changeOrderQuantity(3, -10), 0);
});

test("invalid or missing package factors safely retain the base unit", () => {
  for (const factor of [undefined, NaN, Infinity, 0, -10]) assert.equal(salesUnitFactor(factor), 1);
});
