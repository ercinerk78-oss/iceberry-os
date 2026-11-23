import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { matchImportProducts, normalizeImportName, parseProductImport, parseCountImport, validateImportRows, type ProductImportRow } from "@/lib/product-import";
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
test("product matching ignores invisible whitespace but still requires an exact SKU", () => {
  const item = { ...row, currentName: "ÇİKOLATA BEYAZ ŞİŞE 1 KG", name: "ÇİKOLATA BEYAZ ŞİŞE 1 KG", currentSku: "01.01.2021", sku: "005" };
  const product = { id: "white", name: "\tÇİKOLATA  BEYAZ\u00a0ŞİŞE 1 KG ", sku: "01.01.2021", currency: "TRY" };
  assert.equal(matchImportProducts([item], [product])[0].product.id, "white");
  assert.throws(() => matchImportProducts([item], [{ ...product, sku: "5" }]));
  assert.throws(() => matchImportProducts([item], [{ ...product, name: "ÇİKOLATA BİTTER ŞİŞE 1 KG" }]));
});
test("SKU swaps retain product identity and reject collisions outside the file", () => {
  const products = [{ id: "a", name: "Bir", sku: "001", currency: "TRY" }, { id: "b", name: "İki", sku: "002", currency: "TRY" }];
  const rows = [{ ...row, currentName: "Bir", name: "Bir", currentSku: "001", sku: "002" }, { ...row, currentName: "İki", name: "İki", currentSku: "002", sku: "001" }];
  assert.deepEqual(matchImportProducts(rows, products).map(item => item.product.id), ["a", "b"]);
  assert.throws(() => matchImportProducts(rows.slice(0, 1), products));
  assert.throws(() => matchImportProducts([{ ...row, currentName: "Başka" }], products));
});

test("old SKU identifies the intended record even when another record has the new code", () => {
  const item = { ...row, currentName: "Ahşap Kaşık", name: "Ahşap Kaşık", currentSku: "1133", sku: "056" };
  const products = [{ id: "original", name: "Ahşap Kaşık", sku: "1133", currency: "TRY" }, { id: "other", name: "Ahşap Kaşık", sku: "056", currency: "TRY" }];
  assert.throws(() => matchImportProducts([item], products), /dosya dışındaki başka bir kayıtta/);
  const movingOther = { ...item, currentSku: "056", sku: "057" };
  assert.deepEqual(matchImportProducts([item, movingOther], products).map(match => match.product.id), ["original", "other"]);
});

test("mismatch reports file and existing codes rather than a generic warning", () => {
  assert.throws(() => matchImportProducts([row], [{ id: "p", name: "Ürün", sku: "different", currency: "TRY" }]), /Dosyadaki mevcut SKU: \[old\].*yeni SKU: \[001\].*different/);
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
  sheet.getRow(2).values = ["WAFFLE KUTUSU BASKILI KOLİ 250 AD - 300 ADETLİ", "1135", "", "058", "Firma", 6, 8, "Adet", 1, 300];
  const corrected = await parseProductImport(new Uint8Array(await book.xlsx.writeBuffer()).buffer);
  assert.equal(corrected[0].currentName, "WAFFLE KUTUSU BASKILI KOLİ 250 AD");
  assert.equal(corrected[0].name, "WAFFLE KUTUSU BASKILI KOLİ 300 AD");
  assert.equal(corrected[0].factor, 300);
  sheet.getCell("J2").value = 250;
  const confirmedQuantity = await parseProductImport(new Uint8Array(await book.xlsx.writeBuffer()).buffer);
  assert.equal(confirmedQuantity[0].factor, 300);
  sheet.getRow(2).values = ["ZBARZ Yüksek Protein Bar Yer Fıstığı & Portakal Kakao 35gr*20", "01051", "ZBARZ Yüksek Protein Bar Yer Fıstığı & Portakal Kakao 35gr*20 AD", "105", "Firma", 42.82, 60, "Adet", 1, 20];
  const zbarz = await parseProductImport(new Uint8Array(await book.xlsx.writeBuffer()).buffer);
  assert.equal(zbarz[0].currentName, "ZBARZ Yüksek Protein Bar Yer Fıstığı & Portakal Kakao 35gr");
  assert.equal(zbarz[0].name, "ZBARZ Yüksek Protein Bar Yer Fıstığı & Portakal Kakao 35gr*20 AD");
  assert.equal(zbarz[0].factor, 20);
  sheet.getCell("D2").value = 33;
  await assert.rejects(() => book.xlsx.writeBuffer().then(buffer => parseProductImport(new Uint8Array(buffer).buffer)));
});

test("count import accepts only explicit numeric counts and the confirmed blank bitter row", async () => {
  const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet("Sayım");
  sheet.addRow(["Mevcut Ürün Adı", "20.11.2026 sayım", "Mevcut SKU", "Yeni Ürün Adı", "Yeni SKU", "Tedarikçi Adı", "Yeni Alış Fiyatı (TL/adet)", "Yeni Satış Fiyatı (TL/adet)", "OS / Paraşüt Stok Birimi", "Ticimax Satış Birimi", "Ticimax 1 Satış Birimi İçindeki OS Adedi"]);
  sheet.addRow(["Bitter Pirinç Patlağı PKT 1KG", null, "090", "", "090", "Firma", 195, 250, "Adet", 1, 1]);
  const parse = async () => parseCountImport(new Uint8Array(await book.xlsx.writeBuffer()).buffer);
  assert.equal((await parse())[0].countedQuantity, 0);
  sheet.getCell("C2").value = "091";
  await assert.rejects(parse, /sayım miktarı/);
  sheet.getCell("B2").value = { formula: "2+3", result: 5 };
  await assert.rejects(parse, /sayım miktarı/);
  sheet.getCell("B2").value = -1;
  await assert.rejects(parse, /sayım miktarı/);
  sheet.getCell("B2").value = 42;
  assert.equal((await parse())[0].countedQuantity, 42);
});
