import ExcelJS from "exceljs";

export type ProductImportRow = {
  row: number; currentName: string; currentSku: string; name: string; sku: string;
  supplier: string; purchasePrice: string; salePrice: string; unit: string; factor: number;
};
export const TICIMAX_IMPORT_UNIT = "TICIMAX_SALE";
export const normalizeImportName = (value: string) => value.trim().normalize("NFKC").toLocaleUpperCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");

export function validateImportRows(rows: ProductImportRow[]) {
  if (!rows.length || rows.length > 500) throw new Error("Dosyada 1 ile 500 arasında ürün olmalıdır.");
  const skus = new Set<string>();
  const oldSkus = new Set<string>();
  for (const row of rows) {
    if (!row.currentName || !row.currentSku || !row.name || !row.sku || !row.supplier) throw new Error(`${row.row}. satırda ürün, SKU veya tedarikçi eksik.`);
    if ([row.currentName, row.name, row.supplier].some(value => value.length > 200) || row.sku.length > 120) throw new Error(`${row.row}. satırda metin çok uzun.`);
    if (skus.has(row.sku) || oldSkus.has(row.currentSku)) throw new Error(`${row.row}. satırda tekrarlanan SKU var.`);
    skus.add(row.sku); oldSkus.add(row.currentSku);
    for (const price of [row.purchasePrice, row.salePrice]) {
      if (!/^\d+(?:\.\d{1,15})?$/.test(price) || !Number.isFinite(Number(price)) || Number(price) >= 1e15) throw new Error(`${row.row}. satırda fiyat geçersiz veya desteklenen hassasiyeti aşıyor.`);
    }
    if (!Number.isFinite(row.factor) || row.factor <= 0 || row.factor > 1e9 || (row.unit === "Adet" && !Number.isInteger(row.factor))) throw new Error(`${row.row}. satırda adet dönüşümü geçersiz.`);
    if (!["Adet", "kg"].includes(row.unit)) throw new Error(`${row.row}. satırda stok birimi Adet veya kg olmalıdır.`);
  }
}

export async function parseProductImport(bytes: ArrayBuffer): Promise<ProductImportRow[]> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes);
  if (book.worksheets.length !== 1) throw new Error("Dosyada yalnız bir ürün sayfası olmalıdır.");
  const sheet = book.worksheets[0];
  if (sheet.rowCount > 520 || sheet.columnCount > 30) throw new Error("Dosya boyutları desteklenen sınırı aşıyor.");
  const text = (row: number, col: number) => {
    const cell = sheet.getCell(row, col);
    if (cell.type === ExcelJS.ValueType.Formula || cell.type === ExcelJS.ValueType.Error || cell.type === ExcelJS.ValueType.Date) throw new Error(`${cell.address} hücresinde formül, tarih veya hata yerine düz değer kullanın.`);
    return cell.text.trim();
  };
  const headerRow = Array.from({ length: Math.min(sheet.rowCount, 12) }, (_, i) => i + 1)
    .find(row => text(row, 1) === "Mevcut Ürün Adı");
  if (!headerRow) throw new Error("Ürün şablonunun başlıkları bulunamadı.");
  const headers = new Map<string, number>();
  sheet.getRow(headerRow).eachCell((cell, col) => headers.set(cell.text.trim(), col));
  const column = (name: string) => { const col = headers.get(name); if (!col) throw new Error(`Eksik sütun: ${name}`); return col; };
  const c = {
    currentName: column("Mevcut Ürün Adı"), currentSku: column("Mevcut SKU"), name: column("Yeni Ürün Adı"), sku: column("Yeni SKU"),
    supplier: column("Tedarikçi Adı"), buy: column("Yeni Alış Fiyatı (TL/adet)"), sell: column("Yeni Satış Fiyatı (TL/adet)"),
    unit: column("OS / Paraşüt Stok Birimi"), saleUnit: column("Ticimax Satış Birimi"), factor: column("Ticimax 1 Satış Birimi İçindeki OS Adedi"),
  };
  const rows: ProductImportRow[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row++) {
    if (!text(row, c.currentName)) continue;
    const currentSku = text(row, c.currentSku);
    const sku = text(row, c.sku) || currentSku;
    if (sheet.getCell(row, c.currentSku).type !== ExcelJS.ValueType.String || (text(row, c.sku) && sheet.getCell(row, c.sku).type !== ExcelJS.ValueType.String)) throw new Error(`${row}. satırdaki SKU'ları metin biçiminde yazın; baştaki sıfırlar kaybolmamalı.`);
    const price = (col: number) => text(row, col).replace(",", ".");
    if (!["1", "Koli", "Paket", "Adet"].includes(text(row, c.saleUnit))) throw new Error(`${row}. satırda Ticimax satış birimi geçersiz.`);
    const isTea = currentSku === "03.21.2026" && sku === "033" && text(row, c.currentName).includes("DOĞUŞ");
    rows.push({ row, currentSku, currentName: text(row, c.currentName), name: text(row, c.name) || text(row, c.currentName), sku,
      supplier: text(row, c.supplier), purchasePrice: price(c.buy), salePrice: price(c.sell),
      unit: isTea ? "kg" : text(row, c.unit), factor: Number(text(row, c.factor).replace(",", ".")),
    });
  }
  validateImportRows(rows);
  return rows;
}

export function matchImportProducts<T extends { id: string; name: string; sku: string; currency: string }>(rows: ProductImportRow[], products: T[]) {
  const ids = new Set<string>();
  const matches = rows.map(row => {
    const candidates = products.filter(product =>
      [row.currentName, row.name].includes(product.name) && [row.currentSku, row.sku].includes(product.sku));
    if (candidates.length !== 1 || ids.has(candidates[0].id)) throw new Error(`${row.row}. satırdaki ürün mevcut kayıtla güvenli eşleştirilemedi: ${row.currentName}`);
    const product = candidates[0];
    if (product.currency !== "TRY") throw new Error(`${row.currentName}: Para birimi TL değil, otomatik güncellenmedi.`);
    ids.add(product.id);
    return { row, product };
  });
  for (const { row, product } of matches) {
    if (products.some(other => other.sku === row.sku && other.id !== product.id && !ids.has(other.id))) throw new Error(`${row.sku} kodu dosya dışındaki bir üründe kullanılıyor.`);
  }
  return matches;
}
