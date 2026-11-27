import type { Prisma } from "@prisma/client";

export function canCancelPurchaseRequest(status: string, hasOrder: boolean) {
  return !hasOrder && ["DRAFT", "SUBMITTED"].includes(status);
}

export async function cancelPurchaseRequestInTx(tx: Prisma.TransactionClient, id: string, userId: string) {
  await tx.$queryRaw`SELECT id FROM "PurchaseRequest" WHERE id = ${id} FOR UPDATE`;
  const request = await tx.purchaseRequest.findUnique({ where: { id }, include: { purchaseOrder: { select: { id: true } } } });
  if (!request) throw new Error("Talep bulunamadı.");
  if (!canCancelPurchaseRequest(request.status, Boolean(request.purchaseOrder))) {
    throw new Error("Yalnızca siparişe dönüşmemiş taslak veya onay bekleyen talepler kaldırılabilir.");
  }
  return tx.purchaseRequest.update({ where: { id }, data: {
    status: "CANCELLED",
    approvals: { create: {
      action: "CANCELLED", status: "CANCELLED", actedById: userId,
      comment: "Talep kullanıcı onayıyla aktif listeden kaldırıldı. Kalemler ve geçmiş korundu; stok veya sipariş kaydı değiştirilmedi.",
    } },
  } });
}
