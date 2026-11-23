import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrderTaxTotals } from "./order-tax-totals";

test("confirmed fork tax correction retains quantities and net sale amount", () => {
  assert.deepEqual(calculateOrderTaxTotals([{ lineSubtotal: 500 * 0.6, vatRate: 20 }]), { subtotal: 300, vatTotal: 60, grandTotal: 360 });
  assert.deepEqual(calculateOrderTaxTotals([{ lineSubtotal: 400 * 0.6, vatRate: 20 }]), { subtotal: 240, vatTotal: 48, grandTotal: 288 });
});
test("tax totals reject invalid stored tax rates instead of silently overcharging", () => {
  for (const vatRate of [9100, -1, NaN, Infinity]) assert.throws(() => calculateOrderTaxTotals([{ lineSubtotal: 300, vatRate }]));
  assert.equal(calculateOrderTaxTotals([{ lineSubtotal: 4000, vatRate: 1 }, { lineSubtotal: 300, vatRate: 20 }]).grandTotal, 4400);
});
