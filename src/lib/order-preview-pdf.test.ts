import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { ORDER_PDF_COLUMNS, orderPreviewPdf, previewAmounts, type OrderPreviewPdfInput } from "./order-preview-pdf";

export const previewFixture: OrderPreviewPdfInput = {
  customer:"Deneme Şubesi",address:"Örnek Mahallesi, İstanbul",warehouse:"Merkez Depo",currency:"TRY",notes:"Taslak testidir.",
  items:[{name:"Kraft Poşet — Çığ Şöleni",sku:"044",quantity:250,unit:"Adet",unitPrice:9,vatRate:20,manualShortShipment:true}],
};

test("order PDF omits stock code and fits all remaining columns inside A4 margins", () => {
  assert.deepEqual(ORDER_PDF_COLUMNS.map(column => column.label), ["Ürün Adı", "Adet / Miktar", "Birim", "Satış Birim Fiyatı (KDV hariç)", "Toplam Satış Fiyatı (KDV dahil)"]);
  assert.equal(ORDER_PDF_COLUMNS.reduce((sum, column) => sum + column.width, 0), 595 - 64);
});
test("PDF totals preserve quantities, tax and missing shipment flags",()=>{
  const result=previewAmounts(previewFixture.items);
  assert.equal(result.quantity,250);assert.equal(result.subtotal,2250);
  assert.equal(result.vat,450);assert.equal(result.total,2700);
  assert.equal(result.lines[0].manualShortShipment,true);
  assert.throws(()=>previewAmounts([{...previewFixture.items[0],quantity:Infinity}]));
});
test("draft PDF embeds Turkish fonts and paginates long orders",async()=>{
  const one=await PDFDocument.load(await orderPreviewPdf(previewFixture));
  assert.equal(one.getPageCount(),1);
  const many=await PDFDocument.load(await orderPreviewPdf({...previewFixture,items:Array.from({length:60},(_,i)=>({...previewFixture.items[0],sku:String(i).padStart(3,"0"),name:"Uzun ürün adı Çikolata Şişe — Türkçe ürün açıklaması "+i}))}));
  assert.ok(many.getPageCount()>1);
  for(const page of many.getPages())assert.equal(page.getWidth(),595);
});
