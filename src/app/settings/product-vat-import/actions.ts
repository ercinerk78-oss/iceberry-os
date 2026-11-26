"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseVatWorkbook, matchVatRows } from "@/lib/product-vat-import";
import { signImportPreview, verifyImportPreview } from "@/lib/product-import-token";

type Item = { id: string; name: string; sku: string; oldVatRate: number; vatRate: number; updatedAt: string };
type Manifest = { id: string; userId: string; expires: number; kind: "PRODUCT_VAT"; items: Item[] };
export type VatImportState = { ok: boolean; message: string; token?: string; items?: Item[] };
async function manager() {
  const user = await requirePermission("stock_manage");
  if (user.role !== "GENERAL_MANAGER") throw new Error("Bu işlem yalnız genel müdür tarafından yapılabilir.");
  return user;
}
export async function previewVatImport(_: VatImportState, form: FormData): Promise<VatImportState> {
  const user = await manager();
  try {
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || file.size > 5 * 1024 * 1024) throw new Error("En fazla 5 MB büyüklüğünde XLSX seçin.");
    const rows = await parseVatWorkbook(Buffer.from(await file.arrayBuffer()));
    const products = await prisma.product.findMany({ select: { id: true, name: true, sku: true, vatRate: true, isActive: true, archivedAt: true, updatedAt: true } });
    const items = matchVatRows(rows, products);
    const manifest: Manifest = { id: randomUUID(), kind: "PRODUCT_VAT", userId: user.id, expires: Date.now() + 30 * 60_000, items };
    return { ok: true, message: `${items.length} ürün eşleştirildi. Yalnız KDV oranı güncellenecek.`, token: signImportPreview(manifest), items };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Önizleme hazırlanamadı." }; }
}
export async function applyVatImport(_: VatImportState, form: FormData): Promise<VatImportState> {
  const user = await manager();
  try {
    const manifest = verifyImportPreview<Manifest>(String(form.get("token") ?? ""), user.id);
    if (manifest.kind !== "PRODUCT_VAT" || !manifest.items.length) throw new Error("Geçersiz KDV önizlemesi.");
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('product-catalog-import'))`;
      const applied = await tx.auditLog.findFirst({ where: { entityType: "ProductVatImport", entityId: manifest.id, action: "PRODUCT_VAT_IMPORTED" } });
      if (applied) return "Bu aktarım daha önce uygulandı.";
      for (const item of manifest.items) {
        const updated = await tx.product.updateMany({ where: { id: item.id, sku: item.sku, name: item.name, archivedAt: null, isActive: true, updatedAt: new Date(item.updatedAt), vatRate: item.oldVatRate }, data: { vatRate: item.vatRate } });
        if (updated.count !== 1) throw new Error(`${item.sku}: Ürün önizlemeden sonra değişmiş. Yeniden önizleyin.`);
      }
      await tx.auditLog.create({ data: { userId: user.id, action: "PRODUCT_VAT_IMPORTED", entityType: "ProductVatImport", entityId: manifest.id, description: `${manifest.items.length} ürünün KDV oranı onaylı Excel'den güncellendi. Kategori, fiyat, stok ve geçmiş işlemler değiştirilmedi.`, oldValue: JSON.stringify(manifest.items.map(i => ({ id: i.id, sku: i.sku, vatRate: i.oldVatRate }))), newValue: JSON.stringify(manifest.items.map(i => ({ id: i.id, sku: i.sku, vatRate: i.vatRate }))) } });
      return `${manifest.items.length} ürünün KDV oranı güncellendi. Stok ve geçmiş işlemler korundu.`;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
    for (const path of ["/warehouse/purchase-requests", "/procurement/requests", "/procurement/orders/new", "/warehouse/goods-receipts", "/warehouse/stock", "/orders"]) revalidatePath(path);
    return { ok: true, message: result };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "KDV güncellenemedi." }; }
}
