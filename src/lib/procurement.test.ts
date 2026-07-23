import assert from "node:assert/strict";
import test from "node:test";

import { calculatePurchaseLine, calculatePurchaseTotals, procurementLabel, PURCHASE_ORDER_STATUSES } from "@/lib/procurement";

test("calculatePurchaseLine applies discount before VAT", () => {
  const line = calculatePurchaseLine({ quantity: 10, unitPrice: 100, discountRate: 10, vatRate: 20 });

  assert.deepEqual(line, {
    lineSubtotal: 1000,
    lineDiscount: 100,
    lineVat: 180,
    lineTotal: 1080,
  });
});

test("calculatePurchaseTotals summarizes all money fields", () => {
  const totals = calculatePurchaseTotals([
    calculatePurchaseLine({ quantity: 2, unitPrice: 50, vatRate: 10 }),
    calculatePurchaseLine({ quantity: 1, unitPrice: 100, vatRate: 20, discountRate: 5 }),
  ]);

  assert.deepEqual(totals, {
    subtotal: 200,
    discountTotal: 5,
    vatTotal: 29,
    grandTotal: 224,
  });
});

test("procurementLabel returns Turkish status fallback", () => {
  assert.equal(procurementLabel(PURCHASE_ORDER_STATUSES, "SENT"), "Tedarikçiye Gönderildi");
  assert.equal(procurementLabel(PURCHASE_ORDER_STATUSES, "CUSTOM"), "CUSTOM");
});
