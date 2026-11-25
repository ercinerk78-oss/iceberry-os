import type { Prisma } from "@prisma/client";
import { assertCountEditable, countItemSchema } from "./stock-count";

export async function executeStockCountTransaction(tx: Prisma.TransactionClient, data: FormData, userId: string) {
  const command = String(data.get("command"));
  if (command === "create") {
    const date = String(data.get("date"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("Geçerli bir tarih seçin.");
    const warehouseId = String(data.get("warehouseId") || "");
    if (!await tx.warehouse.findUnique({ where: { id: warehouseId } })) throw new Error("Depo bulunamadı.");
    return (await tx.stockCount.create({ data: { warehouseId, title: `${date} Depo Sayımı`, startedAt: new Date(`${date}T12:00:00+03:00`), assignedUserId: userId } })).id;
  }
  const countId = String(data.get("id") || "");
  await tx.$queryRaw`SELECT id FROM "StockCount" WHERE id = ${countId} FOR UPDATE`;
  const count = await tx.stockCount.findUnique({ where: { id: countId } });
  if (!count) throw new Error("Sayım bulunamadı.");
  assertCountEditable(count.status);
  if (command === "approve") {
    if (!await tx.stockCountItem.count({ where: { stockCountId: countId } })) throw new Error("Önce sayıma ürün ekleyin.");
    if (await tx.stockCountItem.count({ where: { stockCountId: countId, countedQuantity: null } })) throw new Error("Tüm kalemlerin miktarlarını girin.");
    await tx.stockCount.update({ where: { id: countId }, data: { status: "APPROVED", completedAt: new Date(), approvedAt: new Date(), approvedById: userId } });
  } else if (command === "item") {
    if (!String(data.get("quantity") || "").trim()) throw new Error("Miktar girin.");
    const item = countItemSchema.parse({ productId: data.get("productId"), quantity: Number(data.get("quantity")) });
    if (!await tx.product.findUnique({ where: { id: item.productId } })) throw new Error("Ürün bulunamadı.");
    const key = { stockCountId: countId, productId: item.productId };
    const existing = await tx.stockCountItem.findUnique({ where: { stockCountId_productId: key } });
    const stock = await tx.warehouseStock.findUnique({ where: { warehouseId_productId: { warehouseId: count.warehouseId, productId: item.productId } } });
    const expectedQuantity = existing?.expectedQuantity ?? stock?.quantity ?? 0;
    await tx.stockCountItem.upsert({ where: { stockCountId_productId: key }, create: { ...key, expectedQuantity, countedQuantity: item.quantity, differenceQuantity: item.quantity - expectedQuantity }, update: { countedQuantity: item.quantity, differenceQuantity: item.quantity - expectedQuantity } });
  } else if (command === "remove") {
    await tx.stockCountItem.deleteMany({ where: { stockCountId: countId, productId: String(data.get("productId")) } });
  } else throw new Error("Geçersiz işlem.");
  return countId;
}
