import type { Prisma } from "@prisma/client";
import { reserveStock } from "@/lib/stock-service";

export const ORDER_APPROVAL_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 60_000 };

export async function executeOrderApproval(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "FranchiseOrder" WHERE id = ${id} FOR UPDATE`;
  const order = await tx.franchiseOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new Error("Sipariş bulunamadı.");
  if (["DRAFT", "DRAFT_CANCELLED", "CANCELLED", "REJECTED"].includes(order.status)) throw new Error("Bu sipariş onaylanabilir durumda değil.");
  if (order.status !== "SUBMITTED") return order;
  if ("sourceSyncStatus" in order && order.sourceSyncStatus === "MANUAL_REVIEW") throw new Error("Ticimax değişikliği incelenmeden sipariş onaylanamaz.");
  // Consistent stock lock order prevents parallel approvals from deadlocking.
  const items = [...order.items].sort((a, b) => a.productId.localeCompare(b.productId));
  for (const item of items) {
    await reserveStock(tx, {
      warehouseId: order.warehouseId, productId: item.productId, quantity: item.quantity,
      referenceType: "ORDER", referenceId: id, description: `${order.orderNumber} için rezerve edildi.`,
    });
    await tx.franchiseOrderItem.update({ where: { id: item.id }, data: { reservedQuantity: item.quantity, approvedQuantity: item.quantity } });
  }
  return tx.franchiseOrder.update({ where: { id }, data: {
    status: "STOCK_RESERVED", approvedAt: new Date(), reservedAt: new Date(), approvedBy: "Iceberry OS",
    activities: { create: { type: "ORDER_RESERVED", description: "Sipariş onaylandı ve stok rezerve edildi." } },
  } });
}
