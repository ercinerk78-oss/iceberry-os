import assert from "node:assert/strict";
import test from "node:test";
import { assertPurchaseOrderEditable, assertPurchaseQuantity } from "./purchase-order-editing";

test("purchase edits preserve closed orders, received quantities and invoice reconciliation", () => {
  for (const status of ["CANCELLED", "CLOSED", "RECEIVED"]) assert.throws(() => assertPurchaseOrderEditable(status, false));
  assert.throws(() => assertPurchaseOrderEditable("SENT", true));
  for (const status of ["DRAFT", "APPROVED", "SENT", "PARTIALLY_RECEIVED"]) assert.doesNotThrow(() => assertPurchaseOrderEditable(status, false));
  assert.throws(() => assertPurchaseQuantity(4, 5));
  assert.throws(() => assertPurchaseQuantity(0, 0));
  assert.throws(() => assertPurchaseQuantity(NaN, 0));
  assert.doesNotThrow(() => assertPurchaseQuantity(5, 5));
  assert.doesNotThrow(() => assertPurchaseQuantity(10, 5));
});
