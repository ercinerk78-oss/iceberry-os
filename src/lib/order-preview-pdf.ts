import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type OrderPreviewPdfInput = {
  customer: string; address: string; warehouse: string; deliveryDate?: string; notes?: string;
  currency: string;
  items: { name: string; sku: string; quantity: number; unit: string; unitPrice: number; vatRate: number; manualShortShipment: boolean }[];
};

export function previewAmounts(items: OrderPreviewPdfInput["items"]) {
  const lines = items.map((item) => {
    if (![item.quantity,item.unitPrice,item.vatRate].every(Number.isFinite) || item.quantity <= 0 || item.unitPrice < 0 || item.vatRate < 0 || item.vatRate > 100) throw new Error("Geçersiz ürün miktarı veya fiyatı.");
    const subtotal = item.quantity * item.unitPrice;
    const vat = subtotal * item.vatRate / 100;
    if (!Number.isFinite(subtotal + vat)) throw new Error("Sipariş tutarı hesaplanamadı.");
    return { ...item, subtotal, vat, total: subtotal + vat };
  });
  return {
    lines, subtotal: lines.reduce((sum,line) => sum+line.subtotal,0),
    vat: lines.reduce((sum,line) => sum+line.vat,0),
    total: lines.reduce((sum,line) => sum+line.total,0),
    quantity: lines.reduce((sum,line) => sum+line.quantity,0),
  };
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const supported = new Set(font.getCharacterSet());
  const safe = Array.from(text.replace(/[\x00-\x1f]/g," ")).map(c => supported.has(c.codePointAt(0)!) ? c : "?").join("");
  const lines: string[] = [];
  let current = "";
  for (const word of safe.split(/\s+/)) {
    if (font.widthOfTextAtSize((current ? current+" " : "")+word,size) <= width) { current += (current ? " " : "")+word; continue; }
    if (current) { lines.push(current); current=""; }
    for (const char of word) {
      if (font.widthOfTextAtSize(current+char,size) > width && current) { lines.push(current); current=""; }
      current+=char;
    }
  }
  if (current || !lines.length) lines.push(current);
  return lines;
}

export async function orderPreviewPdf(input: OrderPreviewPdfInput) {
  const amounts = previewAmounts(input.items);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(await readFile(path.join(process.cwd(),"public/fonts/LiberationSans-Regular.ttf")),{subset:true});
  const bold = await doc.embedFont(await readFile(path.join(process.cwd(),"public/fonts/LiberationSans-Bold.ttf")),{subset:true});
  const logo = await doc.embedPng(await readFile(path.join(process.cwd(),"public/purchase-order-logo.png")));
  const ink = rgb(.09,.13,.10), red = rgb(.65,.09,.13), border = rgb(.82,.85,.81);
  const margin=32, width=531;
  let page=doc.addPage([595,842]), y=810;
  const money = (value: number) => new Intl.NumberFormat("tr-TR",{style:"currency",currency:input.currency,currencyDisplay:"code"}).format(value);
  const number = (value: number) => new Intl.NumberFormat("tr-TR",{maximumFractionDigits:6}).format(value);
  function newPage() {
    page=doc.addPage([595,842]); y=810;
    page.drawText("ICEBERRY · TASLAK SİPARİŞ",{x:margin,y:y-12,size:11,font:bold,color:ink}); y-=30;
  }
  function paragraph(text: string, font=regular, size=10, color=ink) {
    for (const line of wrap(text,font,size,width)) {
      if (y<58) newPage();
      page.drawText(line,{x:margin,y:y-size,size,font,color}); y-=size+5;
    }
    y-=5;
  }
  page.drawImage(logo,{x:margin,y:746,width:56,height:60});
  page.drawText("BAYİ SİPARİŞ ÖNİZLEMESİ",{x:103,y:786,size:17,font:bold,color:ink});
  page.drawText("TASLAK · Fatura değildir · Henüz gönderilmedi",{x:103,y:766,size:10,font:regular,color:ink});
  y=730;
  paragraph("Oluşturulma: "+new Intl.DateTimeFormat("tr-TR",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Istanbul"}).format(new Date()));
  paragraph("Şube / Grup: "+input.customer,bold);
  paragraph("Teslimat Adresi: "+(input.address || "Belirtilmedi"));
  paragraph("Depo: "+input.warehouse);
  if(input.deliveryDate) paragraph("Talep Edilen Teslim: "+input.deliveryDate);
  const widths=[170,55,55,44,100,107];
  function tableHeader() {
    if(y<100)newPage();
    page.drawRectangle({x:margin,y:y-34,width,height:34,color:rgb(.92,.95,.91)});
    let x=margin;
    ["Ürün Adı","Stok Kodu","Adet / Miktar","Birim","Satış Birim Fiyatı (KDV hariç)","Toplam Satış Fiyatı (KDV dahil)"].forEach((text,i)=>{
      wrap(text,bold,8,widths[i]-10).forEach((line,j)=>page.drawText(line,{x:x+5,y:y-12-j*10,size:8,font:bold,color:ink}));
      x+=widths[i];
    });
    y-=34;
  }
  tableHeader();
  for(const item of amounts.lines) {
    const values=[item.name+(item.manualShortShipment ? " — EKSİK SEVK / TEDARİK BEKLİYOR" : ""),item.sku,number(item.quantity),item.unit,money(item.unitPrice),money(item.total)];
    const columns=values.map((value,i)=>wrap(value,regular,8.5,widths[i]-10));
    let offset=0;
    const count=Math.max(...columns.map(column=>column.length));
    while(offset<count) {
      if(y<85) {newPage();tableHeader();}
      const take=Math.min(count-offset,Math.max(1,Math.floor((y-60-12)/12)));
      const height=take*12+12;
      if(item.manualShortShipment)page.drawRectangle({x:margin,y:y-height,width,height,color:rgb(1,.94,.94)});
      let x=margin;
      columns.forEach((column,i)=>{
        column.slice(offset,offset+take).forEach((line,j)=>page.drawText(line,{x:i===2||i>=4?x+widths[i]-5-regular.widthOfTextAtSize(line,8.5):x+5,y:y-14-j*12,size:8.5,font:regular,color:item.manualShortShipment?red:ink}));
        x+=widths[i];
      });
      page.drawLine({start:{x:margin,y:y-height},end:{x:margin+width,y:y-height},color:border,thickness:.5});
      y-=height;offset+=take;
      if(offset<count){newPage();tableHeader();}
    }
  }
  y-=16;
  if(y<155)newPage();
  const units=new Map<string,number>();
  for(const item of input.items)units.set(item.unit,(units.get(item.unit)??0)+item.quantity);
  for(const [label,value] of [
    ["Ürün Kalemi",String(input.items.length)],["Toplam Miktar",Array.from(units,([unit,quantity])=>number(quantity)+" "+unit).join(" / ")],
    ["Ara Toplam (KDV hariç)",money(amounts.subtotal)],["KDV Toplamı",money(amounts.vat)],["Genel Toplam (KDV dahil)",money(amounts.total)],
  ]) paragraph(label+": "+value,bold,10);
  if(input.notes)paragraph("Sipariş Notu: "+input.notes);
  paragraph("Bu belge sipariş oluşturmaz, stok ayırmaz ve fatura yerine geçmez. Fiyatlar önizleme anındaki sistem kayıtlarından alınmıştır.",regular,8);
  doc.getPages().forEach((p,i)=>p.drawText(`Iceberry OS · Taslak · ${i+1} / ${doc.getPageCount()}`,{x:margin,y:25,size:8,font:regular,color:ink}));
  doc.setTitle("Iceberry Bayi Sipariş Önizlemesi");
  return doc.save();
}
