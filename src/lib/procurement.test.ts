import assert from "node:assert/strict";
import test from "node:test";

import { calculatePurchaseLine, calculatePurchaseTotals, procurementLabel, PURCHASE_ORDER_STATUSES } from "@/lib/procurement";
import { goodsReceiptSchema, purchaseRequestSchema } from "@/lib/validations/procurement";

test("goods receipts accept over and under delivery without changing expected quantity", () => {
  for (const quantity of [40, 50, 60]) {
    const receipt = goodsReceiptSchema.parse({ purchaseOrderId: "order", items: [{ productId: "product", expectedQuantity: 50, receivedQuantity: quantity, acceptedQuantity: quantity }] });
    assert.equal(receipt.items[0].expectedQuantity, 50);
    assert.equal(receipt.items[0].acceptedQuantity, quantity);
    assert.equal(receipt.closeRemaining, false);
  }
});

test("goods receipts allow explicit final delivery and zero acceptance", () => {
  const receipt = goodsReceiptSchema.parse({ purchaseOrderId: "order", closeRemaining: true, items: [{ productId: "product", expectedQuantity: 50, receivedQuantity: 10, acceptedQuantity: 0, damagedQuantity: 10 }] });
  assert.equal(receipt.closeRemaining, true);
  assert.equal(receipt.items[0].acceptedQuantity, 0);
});

test("goods receipts reject acceptance or damage above delivered quantity", () => {
  for (const [acceptedQuantity, damagedQuantity] of [[60, 0], [45, 10]]) {
    assert.equal(goodsReceiptSchema.safeParse({ purchaseOrderId: "order", items: [{ productId: "product", receivedQuantity: 50, acceptedQuantity, damagedQuantity }] }).success, false);
  }
});

test("purchase requests allow an unspecified supplier without a fake supplier record", () => {
  const input = { title: "Depo ihtiyacı", warehouseId: "warehouse-1", items: [{ productId: "product-1", quantity: 12 }] };
  for (const supplierId of [undefined, "", "__UNSPECIFIED__"]) {
    assert.equal(purchaseRequestSchema.parse({ ...input, supplierId }).supplierId, undefined);
  }
  assert.equal(purchaseRequestSchema.parse({ ...input, supplierId: "supplier-1" }).supplierId, "supplier-1");
});

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
