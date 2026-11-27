import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { purchaseOrderExcel, type PurchaseOrderExcelInput } from "./purchase-order-excel";

export const sampleOrder: PurchaseOrderExcelInput = {
  orderNumber: "PO-20261113-BD4563", orderDate: new Date("2026-11-13T00:00:00+03:00"),
  expectedDeliveryDate: new Date("2026-11-23T00:00:00+03:00"), currency: "TRY", grandTotal: "124678.44",
  supplier: { name: "EK GIDA", phone: "0505 984 98 44" },
  warehouse: { name: "Iceberry Merkez Depo", address: "Ayanoğlu Mahallesi, 1928. Sokak No:8A, Iceberry Global Merkez 07020 Kepez/Antalya Iceberry Merkez Depo" },
  notes: "Örnek çıktı: CSV sipariş değerleri ve referans şablon iletişim bilgileri kullanılmıştır.",
  items: [{ productName: "FROZEN YOGURT KARIŞIMI KOLİ 12*750GR", sku: "2236", orderedQuantity: 720, unit: "Adet", unitPrice: "171.45", vatRate: "1", discountRate: "0", notes: "beklemede" }],
  approvals: [{ actedAt: new Date("2026-11-18T10:00:00Z"), comment: "Satın alma siparişi tedarikçiye gönderildi olarak işaretlendi." }],
};

test("purchase export is real XLSX, uses system data and preserves string SKUs", async () => {
  const bytes = await purchaseOrderExcel(sampleOrder);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes);
  const sheet = book.getWorksheet("Sip.Formu")!;
  assert.equal(sheet.getCell("B5").value, sampleOrder.orderNumber);
  assert.equal(sheet.getCell("B4").value, "EK GIDA");
  assert.equal(sheet.getCell("B9").value, "2236");
  assert.equal(sheet.getCell("D9").value, "Adet");
  assert.equal(sheet.getCell("E9").value, 171.45);
  assert.equal((sheet.getCell("F2").value as Date).toISOString().slice(0,10), "2026-11-13");
  assert.equal(sheet.getCell("H9").result, 124678.44);
  assert.equal(sheet.getCell("H14").result, 124678.44);
  assert.equal(sheet.getCell("H9").formula, "ROUND(L9+M9,2)");
  assert.equal(sheet.getCell("H14").formula, "SUM(H9:H9)");
  assert.equal(sheet.getImages().length, 1);
  assert.equal(sheet.getColumn("J").hidden, true);
});

test("export handles extra lines, rounded discounts, foreign currency and formula-like text safely", async () => {
  const input = { ...sampleOrder, currency: "EUR", items: [
    { ...sampleOrder.items[0], sku: "001", productName: "=HYPERLINK(test)", orderedQuantity: 3, unitPrice: "0.33", vatRate: "20", discountRate: "10" },
    { ...sampleOrder.items[0], sku: "002", orderedQuantity: 1, unitPrice: "10", vatRate: "10", discountRate: "0" },
  ] };
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await purchaseOrderExcel(input));
  const sheet = book.getWorksheet("Sip.Formu")!;
  assert.equal(sheet.getCell("B9").value, "001");
  assert.equal(sheet.getCell("A9").value, "=HYPERLINK(test)");
  assert.equal(sheet.getCell("H9").result, 1.07);
  assert.equal(sheet.getCell("H10").result, 11);
  assert.equal(sheet.getCell("H15").result, 12.07);
  assert.match(sheet.getCell("H15").numFmt, /EUR/);
});

test("export removes delivery, contact and approval notes and never freezes or repeats rows", async () => {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await purchaseOrderExcel(sampleOrder));
  const sheet = book.getWorksheet("Sip.Formu")!;
  assert.equal(sheet.getCell("B6").value, "Ayanoğlu Mahallesi, 1928 Sokak No: 8A Iceberry Global Merkez 07020 Kepez / ANTALYA");
  const content = JSON.stringify(sheet.getSheetValues());
  for (const removed of ["BEKLENEN TESLİM TARİHİ", "İrtibat No", sampleOrder.supplier.phone!, "Son Notlar", sampleOrder.approvals[0].comment!]) assert.equal(content.includes(removed), false);
  assert.ok(content.includes("Sipariş Notu"));
  assert.ok(content.includes(sampleOrder.notes!));
  assert.ok(sheet.views.every(view => view.state === "normal"));
  assert.equal(sheet.pageSetup.printTitlesRow, undefined);
  assert.equal(sheet.getCell("A8").value, "ÜRÜN ADI");
});

test("empty order has zero totals and no inverted formula ranges", async () => {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await purchaseOrderExcel({ ...sampleOrder, items: [], grandTotal: 0, notes: null }));
  const sheet = book.getWorksheet("Sip.Formu")!;
  assert.equal(sheet.getCell("H13").result, 0);
  assert.equal(sheet.getCell("H13").formula, "0");
});
