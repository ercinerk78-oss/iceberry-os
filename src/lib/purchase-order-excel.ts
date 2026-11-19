import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { calculatePurchaseLine, calculatePurchaseTotals } from "@/lib/procurement";

type Numeric = number | string | { toString(): string };
export type PurchaseOrderExcelInput = {
  orderNumber: string; orderDate: Date; expectedDeliveryDate: Date | null; currency: string;
  notes: string | null; grandTotal: Numeric;
  supplier: { name: string; phone: string | null };
  warehouse: { name: string; address: string | null };
  items: { productName: string; sku: string; orderedQuantity: number; unit: string;
    unitPrice: Numeric; vatRate: Numeric; discountRate: Numeric; notes: string | null }[];
  approvals: { actedAt: Date; comment: string | null }[];
};

function excelDate(date: Date) {
  const value = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
  return new Date(value + "T00:00:00Z");
}

export async function purchaseOrderExcel(order: PurchaseOrderExcelInput) {
  const book = new ExcelJS.Workbook();
  book.creator = "Iceberry OS";
  book.calcProperties.fullCalcOnLoad = true;
  const sheet = book.addWorksheet("Sip.Formu", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: .25, right: .25, top: .35, bottom: .35, header: .15, footer: .15 } },
    views: [{ state: "frozen", ySplit: 10, showGridLines: false }],
  });
  sheet.columns = [40, 24, 12, 12, 16, 10, 12, 19, 38, 15, 15, 15, 15].map((width) => ({ width }));
  for (const col of ["J","K","L","M"]) sheet.getColumn(col).hidden = true;
  sheet.mergeCells("A1:I1");
  sheet.getRow(1).height = 88;
  const logo = book.addImage({ base64: "data:image/png;base64," + (await readFile(path.join(process.cwd(), "public", "purchase-order-logo.png"))).toString("base64"), extension: "png" });
  sheet.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 90, height: 96 } });
  const fill = "FFEAF0E7";
  function merged(range: string, value: ExcelJS.CellValue) {
    sheet.mergeCells(range);
    sheet.getCell(range.split(":")[0]).value = value;
  }
  merged("A2:E2", "SİPARİŞ TARİHİ"); merged("F2:I2", excelDate(order.orderDate));
  merged("A3:E3", "BEKLENEN TESLİM TARİHİ");
  merged("F3:I3", order.expectedDeliveryDate ? excelDate(order.expectedDeliveryDate) : "Belirtilmedi");
  sheet.getCell("F2").numFmt = sheet.getCell("F3").numFmt = "dd.mm.yyyy";
  [["Şube",order.warehouse.name],["Tedarikçi",order.supplier.name],["İrtibat No",order.supplier.phone ?? "Belirtilmedi"],["Sip NO",order.orderNumber]].forEach(([label,value],i) => {
    sheet.getCell(i+4,1).value = label;
    merged(`B${i+4}:I${i+4}`, value);
    sheet.getRow(i+4).height = 23;
  });
  merged("A8:A9", "SEVK ADRESİ");
  merged("B8:I9", order.warehouse.address ?? "Depo adresi sistemde tanımlı değil.");
  sheet.getRow(8).height = sheet.getRow(9).height = 25;
  const headers = ["ÜRÜN ADI","ÜRÜN STOK KODU / SKU","MİKTAR","BİRİM","Birim Fiyat","KDV (%)","İskonto (%)","Toplam","Not"];
  sheet.getRow(10).values = headers;
  sheet.getRow(10).height = 34;
  const currency = order.currency.toUpperCase().replace(/[^A-Z]/g, "") || "TRY";
  const currencyFormat = `#,##0.00 "${currency}"`;
  const calculated = order.items.map((item,i) => {
    const row = i+11;
    const price = Number(item.unitPrice.toString()), vat = Number(item.vatRate.toString()), discount = Number(item.discountRate.toString());
    if (![item.orderedQuantity,price,vat,discount].every(Number.isFinite)) throw new Error("Sipariş sayısal alanları geçersiz.");
    const amounts = calculatePurchaseLine({ quantity: item.orderedQuantity, unitPrice: price, vatRate: vat, discountRate: discount });
    sheet.getRow(row).values = [item.productName.trim(), item.sku, item.orderedQuantity, item.unit, price, vat, discount, null, item.notes ?? ""];
    const formulas = {
      J: [`ROUND(C${row}*E${row},2)`, amounts.lineSubtotal],
      K: [`ROUND(J${row}*G${row}/100,2)`, amounts.lineDiscount],
      L: [`J${row}-K${row}`, amounts.lineSubtotal-amounts.lineDiscount],
      M: [`ROUND(L${row}*F${row}/100,2)`, amounts.lineVat],
      H: [`ROUND(L${row}+M${row},2)`, amounts.lineTotal],
    } as const;
    for (const [column,[formula,result]] of Object.entries(formulas)) sheet.getCell(`${column}${row}`).value = { formula, result };
    sheet.getCell(`B${row}`).numFmt = "@";
    sheet.getCell(`C${row}`).numFmt = "#,##0.000";
    for (const col of ["E","H"]) sheet.getCell(`${col}${row}`).numFmt = currencyFormat;
    for (const col of ["F","G"]) sheet.getCell(`${col}${row}`).numFmt = '0.00"%"';
    sheet.getRow(row).height = Math.max(32, Math.ceil(item.productName.length/35)*14, Math.ceil((item.notes ?? "").length/35)*14);
    return amounts;
  });
  const totals = calculatePurchaseTotals(calculated);
  const end = 10 + order.items.length;
  let line = end + 2;
  for (const [label,col,result] of [
    ["Ara Toplam","J",totals.subtotal],["İskonto Toplamı","K",totals.discountTotal],
    ["KDV Toplamı","M",totals.vatTotal],["Genel Toplam","H",totals.grandTotal],
  ] as const) {
    merged(`A${line}:G${line}`, label);
    sheet.getCell(`H${line}`).value = { formula: end >= 11 ? `SUM(${col}11:${col}${end})` : "0", result };
    sheet.getCell(`H${line}`).numFmt = currencyFormat;
    sheet.getRow(line).height = 23;
    line++;
  }
  if (Math.abs(Number(order.grandTotal.toString()) - totals.grandTotal) > .011) {
    merged(`A${line}:I${line}`, "Uyarı: Hesaplanan toplam ile sistemde kayıtlı toplam farklı. Sipariş mutabakatını kontrol edin.");
    sheet.getRow(line++).height = 34;
  }
  function note(label: ExcelJS.CellValue, text: string) {
    sheet.getCell(line,1).value = label;
    merged(`B${line}:I${line}`, text);
    sheet.getRow(line).height = Math.min(400,Math.max(26,Math.ceil(text.length/115)*16));
    line++;
  }
  if (order.notes) { line++; note("Sipariş Notu", order.notes); }
  line++;
  merged(`A${line}:I${line}`, "Son Notlar");
  sheet.getRow(line++).height = 25;
  for (const approval of order.approvals) {
    note(excelDate(approval.actedAt), approval.comment ?? "");
    sheet.getCell(line-1,1).numFmt = "dd.mm.yyyy";
  }
  if (!order.approvals.length) note("", "Not bulunmuyor.");
  for (let row=1;row<line;row++) {
    for (let col=1;col<=9;col++) {
      const cell = sheet.getCell(row,col);
      cell.font = { name: "Calibri", size: row===10 ? 10 : 11, bold: row===2 || row===3 || row===10 || (row>end && col===1) };
      cell.alignment = { vertical: "middle", horizontal: row===10 || row===2 || row===3 ? "center" : undefined, wrapText: true };
      if (row>=2) cell.border = { top: {style:"thin",color:{argb:"FFD1D8CE"}}, bottom:{style:"thin",color:{argb:"FFD1D8CE"}}, left:{style:"thin",color:{argb:"FFD1D8CE"}}, right:{style:"thin",color:{argb:"FFD1D8CE"}} };
      if (row===10 || row===2 || row===3) cell.fill = { type:"pattern",pattern:"solid",fgColor:{argb:fill} };
    }
  }
  for (let row=end+2;row<=end+5;row++) sheet.getRow(row).font = { name:"Calibri", size:11, bold:true };
  sheet.pageSetup.printArea = `A1:I${line-1}`;
  sheet.pageSetup.printTitlesRow = "10:10";
  sheet.headerFooter.oddFooter = `&L${order.orderNumber.replaceAll("&","&&")}&R&P / &N`;
  return book.xlsx.writeBuffer();
}
