import assert from "node:assert/strict";
import test from "node:test";

import { calculatePurchaseLine, calculatePurchaseTotals, procurementLabel, PURCHASE_ORDER_STATUSES } from "@/lib/procurement";
import { purchaseRequestSchema } from "@/lib/validations/procurement";

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

test("purchaseRequestSchema accepts decimal comma and request dates", () => {
  const request = purchaseRequestSchema.parse({
    title: "Sos satın alma talebi",
    warehouseId: "warehouse-1",
    orderDate: "2026-09-03",
    neededByDate: "2026-09-05",
    termDate: "2026-09-07",
    items: [
      {
        productId: "product-1",
        quantity: "12,5",
        estimatedUnitCost: "0,70",
        vatRate: "10",
      },
    ],
  });

  assert.equal(request.items[0]?.quantity, 12.5);
  assert.equal(request.items[0]?.estimatedUnitCost, 0.7);
  assert.equal(request.items[0]?.vatRate, 10);
  assert.equal(request.orderDate, "2026-09-03");
  assert.equal(request.neededByDate, "2026-09-05");
  assert.equal(request.termDate, "2026-09-07");
});
