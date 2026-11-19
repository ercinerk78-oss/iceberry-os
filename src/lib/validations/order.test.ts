import { strict as assert } from "node:assert";
import test from "node:test";

import { orderSchema, productSchema } from "@/lib/validations/order";

test("orders accept a standalone branch or an existing group, but require a destination", () => {
  const order = { warehouseId: "warehouse", items: [{ productId: "product", quantity: 1 }] };
  assert.equal(orderSchema.parse({ ...order, branchId: "branch" }).franchiseeId, undefined);
  assert.equal(orderSchema.parse({ ...order, franchiseeId: "group" }).branchId, undefined);
  assert.equal(orderSchema.safeParse(order).success, false);
});

test("manual short shipment is explicit and does not change ordered quantity", () => {
  const input = { branchId: "branch", warehouseId: "warehouse", items: [{ productId: "product", quantity: 10, manualShortShipment: true }] };
  const parsed = orderSchema.parse(input);
  assert.equal(parsed.items[0].manualShortShipment, true);
  assert.equal(parsed.items[0].quantity, 10);
  assert.equal(orderSchema.parse({ ...input, items: [{ productId: "product", quantity: 1 }] }).items[0].manualShortShipment, false);
  assert.equal(orderSchema.safeParse({ ...input, items: [{ productId: "product", quantity: -1 }] }).success, false);
});

test("productSchema treats empty warehouse product money fields as zero", () => {
  const product = productSchema.parse({
    name: "Magnolya Karışımı",
    sku: "MAG-001",
    barcode: "",
    categoryId: "cat_sauces",
    unit: "Adet",
    vatRate: "10",
    purchasePrice: "",
    salePrice: "",
    currency: "TRY",
    minimumStockLevel: "",
    description: "",
  });

  assert.equal(product.purchasePrice, 0);
  assert.equal(product.salePrice, 0);
  assert.equal(product.minimumStockLevel, 0);
  assert.equal(product.vatRate, 10);
});
