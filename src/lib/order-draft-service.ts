import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertDraftEditable, draftDeliveryDate, draftRequestSchema, priceDraftLine, nextWarehouseDraftStage, warehouseDraftStages, type DraftRecord, type DraftRequest } from "@/lib/order-draft";
import { assertOrderLineStock } from "@/lib/order-stock-check";
import { orderNumber } from "@/lib/warehouse";

export class DraftConflict extends Error {}
export async function saveOrderDraft(raw: unknown, userId: string): Promise<DraftRecord> {
  const input = draftRequestSchema.parse(raw);
  return prisma.$transaction(tx => saveOrderDraftTransaction(tx, input, userId), { maxWait: 10_000, timeout: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function saveOrderDraftTransaction(tx: Prisma.TransactionClient, input: DraftRequest, userId: string): Promise<DraftRecord> {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`order-draft:${input.id}`}))`;
    await tx.$queryRaw`SELECT id FROM "FranchiseOrder" WHERE id = ${input.id} FOR UPDATE`;
    const existing = await tx.franchiseOrder.findUnique({ where: { id: input.id }, select: { id: true, orderNumber: true, status: true, draftVersion: true, updatedAt: true, warehouseId: true, warehouseDraftStage: true } });
    if (existing) {
      if (input.command === "submit" && existing.status === "SUBMITTED") return { id: existing.id, version: existing.draftVersion, orderNumber: existing.orderNumber, status: existing.status, updatedAt: existing.updatedAt.toISOString() };
      try { assertDraftEditable(existing.status, existing.draftVersion, input.version); }
      catch (error) { throw new DraftConflict(error instanceof Error ? error.message : "Taslak değişmiş."); }
      if (existing.warehouseId !== input.warehouseId) throw new Error("Taslağın deposu değiştirilemez.");
    } else if (input.version !== 0 || input.command !== "save") throw new DraftConflict("Taslak bulunamadı. Önce taslağı kaydedin.");
    if (input.command === "cancel") {
      const order = await tx.franchiseOrder.update({ where: { id: input.id }, data: { status: "DRAFT_CANCELLED", cancelledAt: new Date(), draftVersion: { increment: 1 }, activities: { create: { type: "DRAFT_CANCELLED", description: "Depo sipariş taslağı iptal edildi. Stok değişmedi.", createdBy: userId } } } });
      return { id: order.id, version: order.draftVersion, orderNumber: order.orderNumber, status: order.status, updatedAt: order.updatedAt.toISOString() };
    }
    if (input.command !== "save") {
      const saved = await tx.franchiseOrder.findUnique({ where: { id: input.id }, include: { items: true } });
      const sameItems = saved && saved.items.length === input.items.length && input.items.every(item => saved.items.some(line => line.productId === item.productId && line.quantity === item.quantity && line.manualShortShipment === item.manualShortShipment));
      if (!saved || !sameItems || (saved.branchId || "") !== (input.branchId || "") || (saved.notes || "") !== (input.notes || "") || saved.invoicePreference !== input.invoicePreference || (saved.requestedDeliveryDate?.toISOString().slice(0, 10) || "") !== (input.requestedDeliveryDate || "") || (!saved.branchId && (saved.franchiseeId || "") !== (input.franchiseeId || ""))) throw new Error("Aşama değiştirmeden önce sipariş değişikliklerini kaydedin.");
    }
    const [warehouse, branch, group, products] = await Promise.all([
      tx.warehouse.findFirst({ where: { id: input.warehouseId, isActive: true }, select: { id: true } }),
      input.branchId ? tx.branch.findFirst({ where: { id: input.branchId, archivedAt: null }, select: { id: true, franchiseeId: true, franchisee: { select: { archivedAt: true } } } }) : null,
      input.franchiseeId ? tx.franchisee.findFirst({ where: { id: input.franchiseeId, archivedAt: null }, select: { id: true } }) : null,
      tx.product.findMany({ where: { id: { in: input.items.map(item => item.productId) }, isActive: true, archivedAt: null }, select: { id: true, name: true, sku: true, unit: true, salePrice: true, vatRate: true, currency: true } }),
    ]);
    if (!warehouse || (input.branchId && !branch) || (input.franchiseeId && !group)) throw new Error("Depo veya seçilen şube bulunamadı; seçimleri kontrol edin.");
    if (input.branchId && input.franchiseeId && branch?.franchiseeId !== input.franchiseeId) throw new Error("Şube seçilen gruba ait değil.");
    if (products.length !== input.items.length) throw new Error("Taslakta pasife alınmış veya bulunamayan ürün var. Ürünü çıkarıp yeniden kaydedin.");
    const currency = products[0]?.currency ?? "TRY";
    if (products.some(product => product.currency !== currency)) throw new Error("Farklı para birimindeki ürünler ayrı sipariş verilmelidir.");
    const stage = input.command === "save" ? "DRAFT" : nextWarehouseDraftStage(existing?.warehouseDraftStage ?? "DRAFT", input.command);
    if (input.command !== "save") {
      if (!input.items.length || (!branch && !group)) throw new Error("Merkeze göndermek için şube ve en az bir ürün seçin.");
    }
    if (input.command === "submit") {
      const stocks = await tx.warehouseStock.findMany({ where: { warehouseId: input.warehouseId, productId: { in: products.map(product => product.id) } }, select: { productId: true, availableQuantity: true } });
      for (const item of input.items) assertOrderLineStock({ quantity: item.quantity, availableQuantity: stocks.find(stock => stock.productId === item.productId)?.availableQuantity ?? 0, manualShortShipment: item.manualShortShipment, productName: products.find(product => product.id === item.productId)!.name });
    }
    const lines = input.items.map(item => priceDraftLine(products.find(product => product.id === item.productId)!, item));
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const vatTotal = lines.reduce((sum, line) => sum + line.lineVat, 0);
    const data = { franchiseeId: branch ? (branch.franchisee?.archivedAt === null ? branch.franchiseeId : null) : group?.id ?? null,
      branchId: branch?.id ?? null, status: input.command === "submit" ? "SUBMITTED" : "DRAFT", warehouseDraftStage: stage, currency, subtotal, vatTotal, grandTotal: subtotal + vatTotal,
      requestedDeliveryDate: draftDeliveryDate(input.requestedDeliveryDate), notes: input.notes || null, invoicePreference: input.invoicePreference,
      invoiceStatus: input.command !== "submit" ? "DRAFT" : input.invoicePreference === "NOT_REQUIRED" ? "NOT_REQUIRED" : "PENDING_MATCH",
      financialStatus: input.command !== "submit" ? "DRAFT" : input.invoicePreference === "NOT_REQUIRED" ? "INVOICE_NOT_REQUIRED" : "INVOICE_PENDING" };
    const order = existing
      ? await tx.franchiseOrder.update({ where: { id: input.id }, data: { ...data, draftVersion: { increment: 1 }, items: { deleteMany: {}, create: lines } } })
      : await tx.franchiseOrder.create({ data: { id: input.id, orderNumber: orderNumber(), warehouseId: input.warehouseId, source: "MANUAL_OTHER", orderType: "FRANCHISE_SALE", createdBy: userId, draftVersion: 1, ...data, items: { create: lines } } });
    // Autosaves update the revision without filling the timeline with identical events.
    if (!existing || input.command === "submit") await tx.orderActivity.create({ data: { orderId: order.id, type: input.command === "submit" ? "WAREHOUSE_DRAFT_APPROVED" : "DRAFT_CREATED", description: input.command === "submit" ? "Depo sipariş taslağını onayladı ve merkez sipariş onayına gönderdi. Stok rezervasyonu yapılmadı." : "Depoda düzenlenebilir sipariş taslağı oluşturuldu.", createdBy: userId } });
    if (existing && input.command !== "submit" && stage !== existing.warehouseDraftStage) await tx.orderActivity.create({ data: { orderId: order.id, type: "WAREHOUSE_DRAFT_STAGE", description: `${warehouseDraftStages[stage as keyof typeof warehouseDraftStages]}${input.command === "save" ? ": sipariş değiştiği için hazırlık onayı sıfırlandı." : ". Stok değişmedi."}`, createdBy: userId } });
    return { id: order.id, version: order.draftVersion, orderNumber: order.orderNumber, status: order.status, updatedAt: order.updatedAt.toISOString(), warehouseDraftStage: order.warehouseDraftStage };
}
