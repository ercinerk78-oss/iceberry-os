import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { matchVatRows, parseVatWorkbook } from "./product-vat-import";
const product = { id: "p", name: "Magnolya Karışımı", sku: "001", vatRate: 20, isActive: true, archivedAt: null, updatedAt: new Date() };
test("numeric Excel SKU only matches a unique active code AND name, without rewriting SKU", () => {
  const rows = [{ row: 2, name: "MAGNOLYA KARIŞIMI", sku: "1", vatRate: 1 }];
  const [match] = matchVatRows(rows, [product]);
  assert.equal(match.sku, "001"); assert.equal(match.vatRate, 1); assert.equal(match.oldVatRate, 20);
  assert.throws(() => matchVatRows([{ ...rows[0], name: "Farklı Ürün" }], [product]), /eşleştirilemedi/);
  assert.throws(() => matchVatRows(rows, [product, { ...product, id: "other", sku: "0001" }]), /eşleştirilemedi/);
  assert.throws(() => matchVatRows(rows, [{ ...product, isActive: false }]), /eşleştirilemedi/);
  assert.throws(() => matchVatRows([...rows, ...rows], [product]), /eşleştirilemedi/);
});
test("VAT parser selects only the dedicated sheet, rejects invalid rates, formulas and duplicate numeric codes", async () => {
  const book = new ExcelJS.Workbook();
  book.addWorksheet("Eski Fiyatlar").addRow(["Fiyat", 123]);
  const sheet = book.addWorksheet("Sayfa1");
  sheet.addRow(["Ürün", "SKU (Ürün Stok Kodu)", "kdv oranı"]);
  sheet.addRow(["Magnolya Karışımı", 1, 1]);
  const bytes = () => book.xlsx.writeBuffer().then(b => Buffer.from(b));
  assert.equal((await parseVatWorkbook(await bytes()))[0].vatRate, 1);
  sheet.getCell("C2").value = 9100;
  await assert.rejects(() => bytes().then(parseVatWorkbook), /geçersiz/);
  sheet.getCell("C2").value = { formula: "1+0", result: 1 };
  await assert.rejects(() => bytes().then(parseVatWorkbook), /formül/);
  sheet.getCell("C2").value = 1; sheet.addRow(["Magnolya Karışımı", "001", 1]);
  await assert.rejects(() => bytes().then(parseVatWorkbook), /tekrarlanıyor/);
});
