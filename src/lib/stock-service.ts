import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

type StockContext = {
  warehouseId: string;
  productId: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  performedById?: string;
};

async function getStock(tx: Tx, warehouseId: string, productId: string) {
  return tx.warehouseStock.findUnique({
    where: { warehouseId_productId: { warehouseId, productId } },
  });
}

function available(quantity: number, reservedQuantity: number) {
  return quantity - reservedQuantity;
}

async function createMovement(
  tx: Tx,
  context: StockContext & {
    movementType: string;
    direction: "IN" | "OUT" | "RESERVE" | "RELEASE";
    quantity: number;
    beforeQuantity: number;
    afterQuantity: number;
    unitCost?: number | null;
    reasonCode?: string;
  },
) {
  return tx.stockMovement.create({
    data: {
      warehouseId: context.warehouseId,
      productId: context.productId,
      movementType: context.movementType,
      direction: context.direction,
      quantity: context.quantity,
      unitCost: context.unitCost ?? null,
      totalCost: context.unitCost != null ? context.unitCost * context.quantity : null,
      beforeQuantity: context.beforeQuantity,
      afterQuantity: context.afterQuantity,
      previousQuantity: context.beforeQuantity,
      newQuantity: context.afterQuantity,
      referenceType: context.referenceType,
      referenceId: context.referenceId,
      reasonCode: context.reasonCode,
      description: context.description,
      performedById: context.performedById,
      occurredAt: new Date(),
      createdBy: context.performedById,
    },
  });
}

export async function setPhysicalStock(
  tx: Tx,
  context: StockContext & { quantity: number; movementType?: string; reasonCode?: string },
) {
  if (context.quantity < 0) throw new Error("Stok miktarı negatif olamaz.");
  const current = await getStock(tx, context.warehouseId, context.productId);
  if (context.quantity < (current?.reservedQuantity ?? 0)) {
    throw new Error("Fiziksel stok, rezerve miktarın altına indirilemez.");
  }

  const reservedQuantity = current?.reservedQuantity ?? 0;
  const beforeQuantity = current?.quantity ?? 0;
  const afterQuantity = context.quantity;
  const stock = await tx.warehouseStock.upsert({
    where: { warehouseId_productId: { warehouseId: context.warehouseId, productId: context.productId } },
    create: {
      warehouseId: context.warehouseId,
      productId: context.productId,
      quantity: afterQuantity,
      reservedQuantity,
      availableQuantity: available(afterQuantity, reservedQuantity),
      lastMovementAt: new Date(),
      version: 1,
    },
    update: {
      quantity: afterQuantity,
      availableQuantity: available(afterQuantity, reservedQuantity),
      lastMovementAt: new Date(),
      version: { increment: 1 },
    },
  });

  await createMovement(tx, {
    ...context,
    movementType: context.movementType ?? (current ? "CORRECTION_IN" : "OPENING_BALANCE"),
    direction: afterQuantity >= beforeQuantity ? "IN" : "OUT",
    quantity: Math.abs(afterQuantity - beforeQuantity),
    beforeQuantity,
    afterQuantity,
  });

  return stock;
}

export async function increaseStock(
  tx: Tx,
  context: StockContext & { quantity: number; movementType: string; unitCost?: number | null },
) {
  if (context.quantity <= 0) throw new Error("Stok giriş miktarı sıfırdan büyük olmalıdır.");
  const current = await getStock(tx, context.warehouseId, context.productId);
  const beforeQuantity = current?.quantity ?? 0;
  const reservedQuantity = current?.reservedQuantity ?? 0;
  const afterQuantity = beforeQuantity + context.quantity;
  const stock = await tx.warehouseStock.upsert({
    where: { warehouseId_productId: { warehouseId: context.warehouseId, productId: context.productId } },
    create: {
      warehouseId: context.warehouseId,
      productId: context.productId,
      quantity: afterQuantity,
      reservedQuantity,
      availableQuantity: available(afterQuantity, reservedQuantity),
      lastPurchasePrice: context.unitCost ?? undefined,
      lastMovementAt: new Date(),
      version: 1,
    },
    update: {
      quantity: { increment: context.quantity },
      availableQuantity: { increment: context.quantity },
      lastPurchasePrice: context.unitCost ?? undefined,
      lastMovementAt: new Date(),
      version: { increment: 1 },
    },
  });

  await createMovement(tx, {
    ...context,
    direction: "IN",
    beforeQuantity,
    afterQuantity,
  });

  return stock;
}

export async function reserveStock(tx: Tx, context: StockContext & { quantity: number }) {
  if (context.quantity <= 0) throw new Error("Rezervasyon miktarı sıfırdan büyük olmalıdır.");
  const current = await getStock(tx, context.warehouseId, context.productId);
  if (!current || current.availableQuantity < context.quantity) throw new Error("Yeterli kullanılabilir stok yok.");
  const beforeAvailable = current.availableQuantity;
  const afterAvailable = current.availableQuantity - context.quantity;
  const updated = await tx.warehouseStock.update({
    where: { id: current.id },
    data: {
      reservedQuantity: { increment: context.quantity },
      availableQuantity: { decrement: context.quantity },
      lastMovementAt: new Date(),
      version: { increment: 1 },
    },
  });
  await createMovement(tx, {
    ...context,
    movementType: "ORDER_RESERVATION",
    direction: "RESERVE",
    beforeQuantity: beforeAvailable,
    afterQuantity: afterAvailable,
  });

  return updated;
}

export async function releaseReservation(tx: Tx, context: StockContext & { quantity: number }) {
  if (context.quantity <= 0) return null;
  const current = await getStock(tx, context.warehouseId, context.productId);
  if (!current) return null;
  const quantity = Math.min(current.reservedQuantity, context.quantity);
  const beforeAvailable = current.availableQuantity;
  const afterAvailable = current.availableQuantity + quantity;
  const updated = await tx.warehouseStock.update({
    where: { id: current.id },
    data: {
      reservedQuantity: { decrement: quantity },
      availableQuantity: { increment: quantity },
      lastMovementAt: new Date(),
      version: { increment: 1 },
    },
  });
  await createMovement(tx, {
    ...context,
    quantity,
    movementType: "RESERVATION_RELEASE",
    direction: "RELEASE",
    beforeQuantity: beforeAvailable,
    afterQuantity: afterAvailable,
  });

  return updated;
}

export async function shipReservedStock(tx: Tx, context: StockContext & { quantity: number }) {
  if (context.quantity <= 0) throw new Error("Sevkiyat miktarı sıfırdan büyük olmalıdır.");
  const current = await getStock(tx, context.warehouseId, context.productId);
  if (!current || current.quantity < context.quantity || current.reservedQuantity < context.quantity) {
    throw new Error("Rezerve fiziksel stok yetersiz.");
  }
  const beforeQuantity = current.quantity;
  const afterQuantity = current.quantity - context.quantity;
  const updated = await tx.warehouseStock.update({
    where: { id: current.id },
    data: {
      quantity: { decrement: context.quantity },
      reservedQuantity: { decrement: context.quantity },
      lastMovementAt: new Date(),
      version: { increment: 1 },
    },
  });
  await createMovement(tx, {
    ...context,
    movementType: "SHIPMENT_OUT",
    direction: "OUT",
    beforeQuantity,
    afterQuantity,
  });

  return updated;
}
