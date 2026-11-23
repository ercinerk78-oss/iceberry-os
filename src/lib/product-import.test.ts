import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { matchImportProducts, normalizeImportName, parseProductImport, validateImportRows, type ProductImportRow } from "@/lib/product-import";
import { signImportPreview, verifyImportPreview } from "@/lib/product-import-token";

const row: ProductImportRow = { row: 9, currentName: "Ürün", currentSku: "old", name: "Ürün", sku: "001", supplier: "Firma", purchasePrice: "0.416666666666667", salePrice: "1.69", unit: "Adet", factor: 12 };
test("catalog validation preserves fractional unit prices and leading zero SKUs", () => {
  validateImportRows([row]); assert.equal(row.sku, "001"); assert.equal(row.purchasePrice, "0.416666666666667");
});
test("catalog validation rejects duplicate codes, invalid prices and fractional item conversions", () => {
  assert.throws(() => validateImportRows([row, { ...row, currentSku: "other" }]));
  for (const patch of [{ purchasePrice: "-1" }, { salePrice: "NaN" }, { factor: 10.5 }, { factor: 0 }, { unit: "Koli" }]) assert.throws(() => validateImportRows([{ ...row, ...patch }]));
});
test("kilogram conversions allow decimal values", () => validateImportRows([{ ...row, unit: "kg", factor: 10.5 }]));
test("SKU swaps retain product identity and reject collisions outside the file", () => {
  const products = [{ id: "a", name: "Bir", sku: "001", currency: "TRY" }, { id: "b", name: "İki", sku: "002", currency: "TRY" }];
  const rows = [{ ...row, currentName: "Bir", name: "Bir", currentSku: "001", sku: "002" }, { ...row, currentName: "İki", name: "İki", currentSku: "002", sku: "001" }];
  assert.deepEqual(matchImportProducts(rows, products).map(item => item.product.id), ["a", "b"]);
  assert.throws(() => matchImportProducts(rows.slice(0, 1), products));
  assert.throws(() => matchImportProducts([{ ...row, currentName: "Başka" }], products));
});
test("import name normalization matches spacing and punctuation without guessing legal names", () => {
  assert.equal(normalizeImportName(" Ek Gıda. "), normalizeImportName("EK GIDA"));
  assert.notEqual(normalizeImportName("EK GIDA"), normalizeImportName("EK GIDA LTD"));
});
test("preview signature blocks tampering, wrong users and expired approvals", () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-secret-for-product-import";
  try {
    const token = signImportPreview({ userId: "u", expires: Date.now() + 10000, value: "001" });
    assert.equal(verifyImportPreview<{ userId: string; expires: number; value: string }>(token, "u").value, "001");
    assert.throws(() => verifyImportPreview(token, "other"));
    assert.throws(() => verifyImportPreview(`e30.${token.split(".")[1]}`, "u"));
    assert.throws(() => verifyImportPreview(signImportPreview({ userId: "u", expires: 0 }), "u"));
  } finally { if (previous === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previous; }
});

test("Excel reader uses column names, preserves precise values and recognizes confirmed tea units", async () => {
  const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet("Ürün Güncelleme");
  sheet.addRow(["Mevcut Ürün Adı", "Mevcut SKU", "Yeni Ürün Adı", "Yeni SKU", "Tedarikçi Adı", "Yeni Alış Fiyatı (TL/adet)", "Yeni Satış Fiyatı (TL/adet)", "OS / Paraşüt Stok Birimi", "Ticimax Satış Birimi", "Ticimax 1 Satış Birimi İçindeki OS Adedi"]);
  sheet.addRow(["DOĞUŞ ÇAY", "03.21.2026", "", "033", "Firma", 515, 570, "Adet", 1, 10.5]);
  const bytes = await book.xlsx.writeBuffer();
  const parsed = await parseProductImport(new Uint8Array(bytes).buffer);
  assert.equal(parsed[0].unit, "kg"); assert.equal(parsed[0].sku, "033"); assert.equal(parsed[0].factor, 10.5);
  sheet.getCell("D2").value = 33;
  await assert.rejects(() => book.xlsx.writeBuffer().then(buffer => parseProductImport(new Uint8Array(buffer).buffer)));
});
