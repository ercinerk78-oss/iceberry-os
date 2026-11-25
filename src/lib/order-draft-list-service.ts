import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertDraftEditable, draftRequestSchema, type DraftRecord } from "./order-draft";
import { draftListCommandSchema, draftProgressLabels } from "./order-draft-progress";
import { DraftConflict, saveOrderDraftTransaction } from "./order-draft-service";

export async function runDraftListCommand(raw: unknown, userId: string) {
  const input = draftListCommandSchema.parse(raw);
  return prisma.$transaction(tx => runDraftListTransaction(tx, input, userId), { maxWait: 10_000, timeout: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function runDraftListTransaction(tx: Prisma.TransactionClient, raw: unknown, userId: string): Promise<DraftRecord> {
  const input = draftListCommandSchema.parse(raw);
  if (input.command === "submit") {
    const saved = await tx.franchiseOrder.findUnique({ where: { id: input.id }, include: { items: true } });
    if (!saved) throw new Error("Taslak bulunamadı.");
    return saveOrderDraftTransaction(tx, draftRequestSchema.parse({ id: saved.id, version: input.version, command: "submit", warehouseId: saved.warehouseId,
      branchId: saved.branchId || undefined, franchiseeId: saved.franchiseeId || undefined,
      notes: saved.notes || undefined, requestedDeliveryDate: saved.requestedDeliveryDate?.toISOString().slice(0, 10), invoicePreference: saved.invoicePreference,
      items: saved.items.map(item => ({ productId: item.productId, quantity: item.quantity, manualShortShipment: item.manualShortShipment })),
    }), userId);
  }
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`order-draft:${input.id}`}))`;
  await tx.$queryRaw`SELECT id FROM "FranchiseOrder" WHERE id = ${input.id} FOR UPDATE`;
  const existing = await tx.franchiseOrder.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Taslak bulunamadı.");
  try { assertDraftEditable(existing.status, existing.draftVersion, input.version); }
  catch (error) { throw new DraftConflict(error instanceof Error ? error.message : "Taslak güncellendi."); }
  if (existing.warehouseDraftStage === input.stage) return { id: existing.id, version: existing.draftVersion, orderNumber: existing.orderNumber, status: existing.status, warehouseDraftStage: existing.warehouseDraftStage, updatedAt: existing.updatedAt.toISOString() };
  const order = await tx.franchiseOrder.update({ where: { id: input.id }, data: { warehouseDraftStage: input.stage, draftVersion: { increment: 1 }, activities: { create: { type: "WAREHOUSE_DRAFT_PROGRESS", description: `${draftProgressLabels[input.stage]}. Yalnız takip durumu güncellendi; stok ve fatura değişmedi.`, createdBy: userId } } } });
  return { id: order.id, version: order.draftVersion, orderNumber: order.orderNumber, status: order.status, warehouseDraftStage: order.warehouseDraftStage, updatedAt: order.updatedAt.toISOString() };
}
