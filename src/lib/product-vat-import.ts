import ExcelJS from "exceljs";

export type VatImportRow = { row: number; name: string; sku: string; vatRate: number };
export const vatImportName = (value: string) => value.normalize("NFKC").toLocaleUpperCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");
const skuKey = (value: string) => /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, "") : value;

export async function parseVatWorkbook(bytes: Buffer): Promise<VatImportRow[]> {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes as unknown as Parameters<typeof book.xlsx.load>[0]);
  const sheet = book.worksheets.find(s => vatImportName(String(s.getCell(1, 1).value ?? "")) === "ÜRÜN" && vatImportName(String(s.getCell(1, 3).value ?? "")) === "KDVORANI");
  if (!sheet) throw new Error("Ürün, SKU ve KDV oranı başlıklı sayfa bulunamadı.");
  const rows: VatImportRow[] = [];
  const seen = new Set<string>();
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const values = [row.getCell(1).value, row.getCell(2).value, row.getCell(3).value];
    if (values.every(v => v === null)) return;
    if (values.some(v => typeof v !== "string" && typeof v !== "number")) throw new Error(`${index}. satırda eksik alan veya formül var.`);
    const [name, sku, rate] = values.map(v => String(v).trim());
    const vatRate = Number(rate);
    if (!name || !sku || ![0, 1, 10, 20].includes(vatRate)) throw new Error(`${index}. satırın ürün, SKU veya KDV değeri geçersiz.`);
    const key = skuKey(sku);
    if (seen.has(key)) throw new Error(`${index}. satırdaki SKU tekrarlanıyor: ${sku}`);
    seen.add(key); rows.push({ row: index, name, sku, vatRate });
  });
  if (!rows.length || rows.length > 1000) throw new Error("Dosya 1–1000 ürün içermeli.");
  return rows;
}

export function matchVatRows<T extends { id: string; name: string; sku: string; vatRate: number; isActive: boolean; archivedAt: Date | null; updatedAt: Date }>(rows: VatImportRow[], products: T[]) {
  const ids = new Set<string>();
  return rows.map(row => {
    const matches = products.filter(p => p.isActive && !p.archivedAt && skuKey(p.sku) === skuKey(row.sku) && vatImportName(p.name) === vatImportName(row.name));
    if (matches.length !== 1 || ids.has(matches[0].id)) throw new Error(`${row.row}. satır güvenli eşleştirilemedi: ${row.name} · SKU ${row.sku}`);
    const product = matches[0]; ids.add(product.id);
    return { id: product.id, name: product.name, sku: product.sku, oldVatRate: product.vatRate, vatRate: row.vatRate, updatedAt: product.updatedAt.toISOString() };
  });
}
