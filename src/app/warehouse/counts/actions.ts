"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCountEditable, countItemSchema } from "@/lib/stock-count";

export async function countCommand(data: FormData): Promise<{ id?: string; error?: string }> {
  const user = await requirePermission("warehouse");
  try {
    const command = String(data.get("command"));
    const id = await prisma.$transaction(async (tx) => {
      if (command === "create") {
        const date = String(data.get("date"));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("Geçerli bir tarih seçin.");
        const warehouseId = String(data.get("warehouseId") || "");
        if (!await tx.warehouse.findUnique({ where: { id: warehouseId } })) throw new Error("Depo bulunamadı.");
        return (await tx.stockCount.create({ data: { warehouseId, title: `${date} Depo Sayımı`, startedAt: new Date(`${date}T12:00:00+03:00`), assignedUserId: user.id } })).id;
      }
      const countId = String(data.get("id") || "");
      await tx.$queryRaw`SELECT id FROM "StockCount" WHERE id = ${countId} FOR UPDATE`;
      const count = await tx.stockCount.findUnique({ where: { id: countId } });
      if (!count) throw new Error("Sayım bulunamadı.");
      assertCountEditable(count.status);
      if (command === "approve") {
        if (!await tx.stockCountItem.count({ where: { stockCountId: countId } })) throw new Error("Önce sayıma ürün ekleyin.");
        if (await tx.stockCountItem.count({ where: { stockCountId: countId, countedQuantity: null } })) throw new Error("Tüm kalemlerin miktarlarını girin.");
        await tx.stockCount.update({ where: { id: countId }, data: { status: "APPROVED", completedAt: new Date(), approvedAt: new Date(), approvedById: user.id } });
      } else if (command === "item") {
        const item = countItemSchema.parse({ productId: data.get("productId"), quantity: Number(data.get("quantity")) });
        if (!String(data.get("quantity") || "").trim()) throw new Error("Miktar girin.");
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error("Ürün bulunamadı.");
        const key = { stockCountId: countId, productId: item.productId };
        const existing = await tx.stockCountItem.findUnique({ where: { stockCountId_productId: key } });
        const stock = await tx.warehouseStock.findUnique({ where: { warehouseId_productId: { warehouseId: count.warehouseId, productId: item.productId } } });
        const expectedQuantity = existing?.expectedQuantity ?? stock?.quantity ?? 0;
        await tx.stockCountItem.upsert({ where: { stockCountId_productId: key }, create: { ...key, expectedQuantity, countedQuantity: item.quantity, differenceQuantity: item.quantity - expectedQuantity }, update: { countedQuantity: item.quantity, differenceQuantity: item.quantity - expectedQuantity } });
      } else if (command === "remove") {
        await tx.stockCountItem.deleteMany({ where: { stockCountId: countId, productId: String(data.get("productId")) } });
      } else throw new Error("Geçersiz işlem.");
      return countId;
    });
    revalidatePath("/warehouse/counts");
    return { id };
  } catch (error) {
    console.error("Stock count command failed", error);
    if (error instanceof ZodError) return { error: "Geçerli bir ürün ve sıfır veya daha büyük bir miktar girin." };
    return { error: error instanceof Error && !error.message.includes("prisma") ? error.message : "Sayım kaydedilemedi. Tekrar deneyin." };
  }
}
