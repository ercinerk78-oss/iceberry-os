import assert from "node:assert/strict";
import test from "node:test";
import { assertCountEditable, countItemSchema } from "./stock-count";

test("stock counts accept zero and fractional base quantities", () => {
  for (const quantity of [0, 42, 10.5]) assert.equal(countItemSchema.parse({ productId: "tea", quantity }).quantity, quantity);
  for (const quantity of [-1, Infinity, NaN]) assert.equal(countItemSchema.safeParse({ productId: "tea", quantity }).success, false);
});
test("approved and legacy completed counts cannot be edited", () => {
  assert.doesNotThrow(() => assertCountEditable("DRAFT"));
  for (const status of ["APPROVED", "COMPLETED", "CANCELLED"]) assert.throws(() => assertCountEditable(status), /değiştirilemez/);
});
