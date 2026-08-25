import test from "node:test";
import assert from "node:assert/strict";

import { shipmentBasedInvoiceSummary } from "@/lib/order-invoicing";

test("shipmentBasedInvoiceSummary invoices only warehouse approved quantity before shipment", () => {
  const summary = shipmentBasedInvoiceSummary([
    {
      productName: "Iceberry Bardak",
      sku: "BRD-001",
      unit: "Adet",
      unitPrice: 10,
      vatRate: 20,
      packedQuantity: 7,
      shippedQuantity: 0,
    },
  ]);

  assert.equal(summary.lines.length, 1);
  assert.equal(summary.lines[0].quantity, 7);
  assert.equal(summary.grandTotal, 84);
});

test("shipmentBasedInvoiceSummary excludes zero shipped or packed lines", () => {
  const summary = shipmentBasedInvoiceSummary([
    {
      productName: "Iceberry Peçete",
      sku: "PCT-001",
      unit: "Adet",
      unitPrice: 5,
      vatRate: 20,
      packedQuantity: 0,
      shippedQuantity: 0,
    },
  ]);

  assert.equal(summary.lines.length, 0);
  assert.equal(summary.grandTotal, 0);
});

test("shipmentBasedInvoiceSummary prefers actual shipped quantity after shipment", () => {
  const summary = shipmentBasedInvoiceSummary([
    {
      productName: "Iceberry Kapak",
      sku: "KPK-001",
      unit: "Adet",
      unitPrice: 3,
      vatRate: 20,
      packedQuantity: 10,
      shippedQuantity: 4,
    },
  ]);

  assert.equal(summary.lines[0].quantity, 4);
  assert.equal(summary.grandTotal, 14.4);
});
