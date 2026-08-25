import test from "node:test";
import assert from "node:assert/strict";

import { nextPickedQuantity } from "@/lib/product-barcodes";

test("nextPickedQuantity adds package barcode conversion to base stock quantity", () => {
  assert.equal(nextPickedQuantity({
    currentPickedQuantity: 0,
    orderedQuantity: 1000,
    scannedConversionFactor: 1000,
  }), 1000);
});

test("nextPickedQuantity supports broken case partial quantity flow", () => {
  assert.equal(nextPickedQuantity({
    currentPickedQuantity: 250,
    orderedQuantity: 500,
    scannedConversionFactor: 50,
  }), 300);
});

test("nextPickedQuantity blocks scanning more than ordered quantity", () => {
  assert.throws(() => nextPickedQuantity({
    currentPickedQuantity: 300,
    orderedQuantity: 500,
    scannedConversionFactor: 1000,
  }), /Sipariş miktarı aşılamaz/);
});
