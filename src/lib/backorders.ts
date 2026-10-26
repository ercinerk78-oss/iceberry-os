import type { Prisma, PrismaClient } from "@prisma/client";

export const BACKORDER_STATUSES = {
  OPEN: "Açık",
  PARTIALLY_FULFILLED: "Kısmen Tamamlandı",
  FULFILLED: "Tamamlandı",
  CANCELLED: "İptal",
} as const;

export const BACKORDER_REASONS = {
  STOCK_SHORTAGE: "Stok Yetersiz",
  WAITING_PRODUCT: "Ürün Bekleniyor",
  SUPPLY_DELAY: "Tedarik Gecikmesi",
  DAMAGED_PRODUCT: "Hasarlı Ürün",
  WRONG_PICK: "Yanlış Ürün Hazırlığı",
  VEHICLE_CAPACITY: "Araç Kapasitesi",
  OTHER: "Diğer",
} as const;

type Tx = Prisma.TransactionClient | PrismaClient;

export function backorderStatusLabel(status: string) {
  return BACKORDER_STATUSES[status as keyof typeof BACKORDER_STATUSES] ?? status;
}

export function backorderReasonLabel(reason: string) {
  return BACKORDER_REASONS[reason as keyof typeof BACKORDER_REASONS] ?? reason;
}

export function outstandingStatus(outstandingQuantity: number, fulfilledQuantity: number) {
  if (outstandingQuantity <= 0) return "FULFILLED";
  if (fulfilledQuantity > 0) return "PARTIALLY_FULFILLED";
  return "OPEN";
}

export async function upsertShipmentBackorder(
  tx: Tx,
  input: {
    orderId: string;
    orderItemId: string;
    shipmentId?: string | null;
    branchId?: string | null;
    productId: string;
    orderedQuantity: number;
    shippedQuantity: number;
    unit: string;
    reason?: string | null;
    note?: string | null;
    expectedFulfillmentDate?: Date | null;
    createdById?: string | null;
  },
) {
  const outstandingQuantity = Math.max(0, input.orderedQuantity - input.shippedQuantity);

  if (outstandingQuantity <= 0) {
    await tx.shipmentBackorder.updateMany({
      where: { franchiseOrderItemId: input.orderItemId, status: { in: ["OPEN", "PARTIALLY_FULFILLED"] } },
      data: {
        outstandingQuantity: 0,
        fulfilledQuantity: { increment: 0 },
        status: "FULFILLED",
        fulfilledAt: new Date(),
        completedById: input.createdById ?? undefined,
      },
    });
    return null;
  }

  return tx.shipmentBackorder.upsert({
    where: { franchiseOrderItemId: input.orderItemId },
    create: {
      franchiseOrderId: input.orderId,
      franchiseOrderItemId: input.orderItemId,
      shipmentId: input.shipmentId ?? null,
      branchId: input.branchId ?? null,
      productId: input.productId,
      orderedQuantity: input.orderedQuantity,
      shippedQuantity: input.shippedQuantity,
      outstandingQuantity,
      unit: input.unit,
      status: "OPEN",
      reason: input.reason || "STOCK_SHORTAGE",
      note: input.note || null,
      expectedFulfillmentDate: input.expectedFulfillmentDate ?? null,
      createdById: input.createdById ?? null,
    },
    update: {
      shipmentId: input.shipmentId ?? undefined,
      branchId: input.branchId ?? undefined,
      orderedQuantity: input.orderedQuantity,
      shippedQuantity: input.shippedQuantity,
      outstandingQuantity,
      status: outstandingStatus(outstandingQuantity, 0),
      reason: input.reason || undefined,
      note: input.note || undefined,
      expectedFulfillmentDate: input.expectedFulfillmentDate ?? undefined,
    },
  });
}
