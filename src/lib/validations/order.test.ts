import { strict as assert } from "node:assert";
import test from "node:test";

import { productSchema } from "@/lib/validations/order";

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
