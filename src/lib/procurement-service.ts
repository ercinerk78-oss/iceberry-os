import { Prisma } from "@prisma/client";
import { assertPurchaseRequestDraft } from "@/lib/purchase-request-drafts";
import { assertPurchaseOrderEditable, assertPurchaseQuantity } from "@/lib/purchase-order-editing";

import { calculatePurchaseLine, calculatePurchaseTotals, purchaseOrderNumber, purchaseRequestNumber } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";
import { increaseStock } from "@/lib/stock-service";
import { goodsReceiptSchema, purchaseOrderLineSchema, purchaseOrderSchema, purchaseRequestSchema, supplierProductSchema } from "@/lib/validations/procurement";

type PurchaseOrderInput = Parameters<typeof purchaseOrderSchema.parse>[0];
type PurchaseRequestInput = Parameters<typeof purchaseRequestSchema.parse>[0];
type GoodsReceiptInput = Parameters<typeof goodsReceiptSchema.parse>[0];
type SupplierProductInput = Parameters<typeof supplierProductSchema.parse>[0];

export async function createPurchaseRequest(input: PurchaseRequestInput, userId?: string, draft?: { id: string; updatedAt: string }) {
  const data = purchaseRequestSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    if (draft) {
      await tx.$queryRaw`SELECT id FROM "PurchaseRequest" WHERE id = ${draft.id} FOR UPDATE`;
      const existing = await tx.purchaseRequest.findUnique({ where: { id: draft.id }, include: { purchaseOrder: { select: { id: true } } } });
      if (!existing) throw new Error("Talep bulunamadı.");
      assertPurchaseRequestDraft(existing.status, Boolean(existing.purchaseOrder));
      if (existing.updatedAt.toISOString() !== draft.updatedAt) throw new Error("Talep başka bir kullanıcı tarafından güncellendi. Sayfayı yenileyin.");
    }
    const [warehouse, supplier, products] = await Promise.all([
      tx.warehouse.findFirst({ where: { id: data.warehouseId, archivedAt: null, isActive: true } }),
      data.supplierId ? tx.supplier.findFirst({ where: { id: data.supplierId, archivedAt: null } }) : Promise.resolve(null),
      tx.product.findMany({
        where: { id: { in: data.items.map((item) => item.productId) }, archivedAt: null, isActive: true },
      }),
    ]);

    if (!warehouse) throw new Error("Aktif depo bulunamadı.");
    if (data.supplierId && !supplier) throw new Error("Tedarikçi bulunamadı.");
    if (products.length !== data.items.length) throw new Error("Talepte aktif olmayan ürün var.");

    const details = {
        title: data.title,
        warehouseId: warehouse.id,
        supplierId: supplier?.id ?? null,
        status: "DRAFT",
        priority: data.priority,
        orderDate: data.orderDate ? new Date(data.orderDate) : null,
        neededByDate: data.neededByDate ? new Date(data.neededByDate) : null,
        termDate: data.termDate ? new Date(data.termDate) : null,
        notes: data.notes || null,
        items: {
          ...(draft ? { deleteMany: {} } : {}),
          create: data.items.map((item) => {
            const product = products.find((row) => row.id === item.productId);
            if (!product) throw new Error("Ürün bulunamadı.");
            return {
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              unit: product.unit,
              requestedQuantity: item.quantity,
              approvedQuantity: item.quantity,
              estimatedUnitCost: item.estimatedUnitCost == null ? null : new Prisma.Decimal(item.estimatedUnitCost),
              vatRate: new Prisma.Decimal(product.vatRate),
              notes: item.notes || null,
            };
          }),
        },
        approvals: {
          create: {
            action: draft ? "DRAFT_UPDATED" : "DRAFT_CREATED",
            status: "DRAFT",
            comment: draft ? "Satın alma talebi taslağı güncellendi." : "Satın alma talebi taslağı oluşturuldu.",
            actedById: userId,
          },
        },
      };
    const request = draft
      ? await tx.purchaseRequest.update({ where: { id: draft.id }, data: details, select: { id: true, requestNumber: true, updatedAt: true } })
      : await tx.purchaseRequest.create({ data: { ...details, requestNumber: purchaseRequestNumber(), requestedById: userId }, select: { id: true, requestNumber: true, updatedAt: true } });

    return request;
  });
}

export async function submitPurchaseRequest(id: string, userId: string, updatedAt: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "PurchaseRequest" WHERE id = ${id} FOR UPDATE`;
    const request = await tx.purchaseRequest.findUnique({ where: { id }, include: { items: true, purchaseOrder: { select: { id: true } } } });
    if (!request) throw new Error("Talep bulunamadı.");
    assertPurchaseRequestDraft(request.status, Boolean(request.purchaseOrder));
    if (request.updatedAt.toISOString() !== updatedAt) throw new Error("Talep değişti. Güncel taslağı kontrol ederek tekrar onaya gönderin.");
    if (!request.items.length) throw new Error("En az bir ürün eklemelisiniz.");
    return tx.purchaseRequest.update({ where: { id }, data: {
      status: "SUBMITTED",
      approvals: { create: { action: "SUBMITTED", status: "SUBMITTED", comment: "Talep satın alma onayına gönderildi.", actedById: userId } },
    } });
  });
}

export async function createPurchaseOrder(input: PurchaseOrderInput, userId?: string) {
  const data = purchaseOrderSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const [supplier, warehouse, sourceRequest, products, supplierProductLinks] = await Promise.all([
      tx.supplier.findFirst({ where: { id: data.supplierId, archivedAt: null } }),
      tx.warehouse.findFirst({ where: { id: data.warehouseId, archivedAt: null, isActive: true } }),
      data.sourceRequestId
        ? tx.purchaseRequest.findUnique({
          where: { id: data.sourceRequestId },
          include: { purchaseOrder: { select: { id: true } } },
        })
        : Promise.resolve(null),
      tx.product.findMany({
        where: { id: { in: data.items.map((item) => item.productId) }, archivedAt: null, isActive: true },
      }),
      tx.supplierProduct.findMany({
        where: { supplierId: data.supplierId, productId: { in: data.items.map((item) => item.productId) }, isActive: true },
        select: { productId: true },
      }),
    ]);

    if (!supplier) throw new Error("Tedarikçi bulunamadı.");
    if (!warehouse) throw new Error("Aktif depo bulunamadı.");
    if (products.length !== data.items.length) throw new Error("Siparişte aktif olmayan ürün var.");
    if (data.sourceRequestId && !sourceRequest) throw new Error("Satın alma talebi bulunamadı.");
    if (sourceRequest?.purchaseOrder) throw new Error("Bu talep daha önce siparişe dönüştürülmüş.");
    if (sourceRequest && !["SUBMITTED", "APPROVED"].includes(sourceRequest.status)) {
      throw new Error("Yalnızca onaya gönderilmiş talepler siparişe dönüştürülebilir.");
    }

    const lines = data.items.map((item) => {
      const product = products.find((row) => row.id === item.productId);
      if (!product) throw new Error("Ürün bulunamadı.");
      if (!supplierProductLinks.some((link) => link.productId === item.productId)) {
        throw new Error(`${product.name} seçilen tedarikçiye bağlı değil. Önce tedarikçi ürün eşleştirmesi yapmalısınız.`);
      }
      // New orders snapshot the product tax; existing orders and receipts keep their stored rate.
      item.vatRate = product.vatRate;
      const amounts = calculatePurchaseLine({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        discountRate: item.discountRate,
      });

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        orderedQuantity: item.quantity,
        remainingQuantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        vatRate: new Prisma.Decimal(item.vatRate),
        discountRate: new Prisma.Decimal(item.discountRate),
        lineSubtotal: new Prisma.Decimal(amounts.lineSubtotal),
        lineDiscount: new Prisma.Decimal(amounts.lineDiscount),
        lineVat: new Prisma.Decimal(amounts.lineVat),
        lineTotal: new Prisma.Decimal(amounts.lineTotal),
        notes: item.notes || null,
      };
    });
    const totals = calculatePurchaseTotals(lines.map((line) => ({
      lineSubtotal: line.lineSubtotal.toNumber(),
      lineDiscount: line.lineDiscount.toNumber(),
      lineVat: line.lineVat.toNumber(),
      lineTotal: line.lineTotal.toNumber(),
    })));

    const order = await tx.purchaseOrder.create({
      data: {
        orderNumber: purchaseOrderNumber(),
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        sourceRequestId: sourceRequest?.id,
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        subtotal: new Prisma.Decimal(totals.subtotal),
        discountTotal: new Prisma.Decimal(totals.discountTotal),
        vatTotal: new Prisma.Decimal(totals.vatTotal),
        grandTotal: new Prisma.Decimal(totals.grandTotal),
        currency: data.currency,
        paymentTermDays: data.paymentTermDays,
        externalReference: data.externalReference || null,
        notes: data.notes || null,
        createdById: userId,
        items: { create: lines },
        approvals: {
          create: {
            action: "CREATED",
            status: "DRAFT",
            comment: "Satın alma siparişi taslak olarak oluşturuldu.",
            actedById: userId,
          },
        },
      },
      select: { id: true, orderNumber: true },
    });

    for (const item of data.items) {
      await tx.supplierProduct.upsert({
        where: { supplierId_productId: { supplierId: supplier.id, productId: item.productId } },
        create: {
          supplierId: supplier.id,
          productId: item.productId,
          currency: data.currency,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lastQuotedAt: new Date(),
        },
        update: {
          currency: data.currency,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lastQuotedAt: new Date(),
        },
      });
    }

    if (sourceRequest) {
      await tx.purchaseRequest.update({
        where: { id: sourceRequest.id },
        data: {
          status: "CONVERTED",
          approvedById: userId,
          approvedAt: new Date(),
          approvals: {
            create: {
              action: "CONVERTED_TO_ORDER",
              status: "CONVERTED",
              comment: `${order.orderNumber} numaralı satın alma siparişine dönüştürüldü.`,
              actedById: userId,
            },
          },
        },
      });
    }

    return order;
  });
}

export async function createGoodsReceipt(input: GoodsReceiptInput, userId?: string) {
  const data = goodsReceiptSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${data.purchaseOrderId} FOR UPDATE`;
    const order = await tx.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
      include: { items: true, supplier: true, warehouse: true },
    });
    if (!order) throw new Error("Satın alma siparişi bulunamadı.");
    if (!["APPROVED", "SENT", "PARTIALLY_RECEIVED"].includes(order.status)) throw new Error("Bu sipariş için mal kabul yapılamaz. Sayfayı yenileyin.");
    if (new Set(data.items.map((item) => item.productId)).size !== data.items.length) throw new Error("Aynı ürün birden fazla satırda kabul edilemez.");
    for (const item of data.items) {
      const orderItem = order.items.find((line) => line.productId === item.productId);
      if (!orderItem) throw new Error("Siparişte olmayan ürün mal kabul edilemez.");
      if (Math.abs(orderItem.remainingQuantity - item.expectedQuantity) > 0.000001) throw new Error("Kalan sipariş miktarı değişti. Sayfayı yenileyerek tekrar kontrol edin.");
      item.expectedQuantity = orderItem.remainingQuantity;
    }

    const acceptedItems = data.items.filter((item) => item.acceptedQuantity > 0 || item.receivedQuantity > 0 || item.damagedQuantity > 0);
    if (!acceptedItems.length) throw new Error("Mal kabul için en az bir miktar girmelisiniz.");

    const totalExpectedItems = acceptedItems.reduce((sum, item) => sum + item.expectedQuantity, 0);
    const totalReceivedItems = acceptedItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
    const hasDiscrepancy = acceptedItems.some((item) => item.damagedQuantity > 0 || item.acceptedQuantity !== item.expectedQuantity);

    const receipt = await tx.goodsReceipt.create({
      data: {
        warehouseId: order.warehouseId,
        supplierId: order.supplierId,
        purchaseOrderId: order.id,
        sourceSystem: "MANUAL",
        invoiceNumber: data.invoiceNumber || null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
        status: "COMPLETED",
        totalExpectedItems,
        totalReceivedItems,
        discrepancyStatus: hasDiscrepancy ? "REVIEW_REQUIRED" : "NONE",
        receivedById: userId,
        completedAt: new Date(),
        notes: data.notes || null,
        items: {
          create: acceptedItems.map((item) => {
            const orderItem = order.items.find((row) => row.productId === item.productId);
            if (!orderItem) throw new Error("Siparişte olmayan ürün mal kabul edilemez.");
            const missingQuantity = Math.max(0, item.expectedQuantity - item.receivedQuantity);
            const excessQuantity = Math.max(0, item.receivedQuantity - item.expectedQuantity);

            return {
              productId: item.productId,
              expectedQuantity: item.expectedQuantity,
              receivedQuantity: item.receivedQuantity,
              acceptedQuantity: item.acceptedQuantity,
              damagedQuantity: item.damagedQuantity,
              missingQuantity,
              excessQuantity,
              unit: orderItem.unit,
              unitCost: orderItem.unitPrice.toNumber(),
              lotNumber: item.lotNumber || null,
              expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
              discrepancyReason: missingQuantity || excessQuantity || item.damagedQuantity ? "Sayım farkı" : null,
              notes: item.notes || null,
            };
          }),
        },
      },
      include: { items: true },
    });

    for (const item of receipt.items) {
      if (!item.productId || item.acceptedQuantity <= 0) continue;
      await increaseStock(tx, {
        warehouseId: order.warehouseId,
        productId: item.productId,
        quantity: item.acceptedQuantity,
        movementType: "PURCHASE_RECEIPT",
        referenceType: "GoodsReceipt",
        referenceId: receipt.id,
        description: `${order.orderNumber} satın alma siparişi mal kabulü`,
        performedById: userId,
        unitCost: item.unitCost,
        valuationCurrency: order.currency,
      });

      if (item.lotNumber) {
        await tx.inventoryLot.upsert({
          where: { warehouseId_productId_lotNumber: { warehouseId: order.warehouseId, productId: item.productId, lotNumber: item.lotNumber } },
          create: {
            warehouseId: order.warehouseId,
            productId: item.productId,
            lotNumber: item.lotNumber,
            expirationDate: item.expirationDate,
            quantityOnHand: item.acceptedQuantity,
            supplierId: order.supplierId,
            goodsReceiptItemId: item.id,
          },
          update: {
            quantityOnHand: { increment: item.acceptedQuantity },
            expirationDate: item.expirationDate,
            supplierId: order.supplierId,
          },
        });
      }
    }

    await syncPurchaseOrderReceiptProgressInTx(tx, order.id);
    if (data.closeRemaining) {
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "CLOSED", closedAt: new Date() } });
      await tx.purchaseApproval.create({ data: {
        purchaseOrderId: order.id, action: "CLOSED", status: "CLOSED", actedById: userId,
        comment: "Mal kabul sonrası başka teslimat beklenmediği belirtilerek sipariş kapatıldı. Sipariş ve teslimat miktarları korundu.",
      } });
    }
    return receipt;
  }, { maxWait: 5_000, timeout: 30_000 });
}

export async function approvePurchaseOrder(id: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw new Error("Satın alma siparişi bulunamadı.");
    if (["CANCELLED", "CLOSED", "RECEIVED"].includes(order.status)) throw new Error("Kapalı sipariş onaylanamaz.");

    await tx.purchaseApproval.create({
      data: {
        purchaseOrderId: id,
        action: "APPROVED",
        status: "APPROVED",
        comment: "Satın alma siparişi onaylandı.",
        actedById: userId,
      },
    });

    return tx.purchaseOrder.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvalStatus: "APPROVED",
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  });
}

export async function markPurchaseOrderSent(id: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({ where: { id }, select: { status: true, approvalStatus: true } });
    if (!order) throw new Error("Satın alma siparişi bulunamadı.");
    if (order.approvalStatus !== "APPROVED") throw new Error("Sipariş tedarikçiye gönderilmeden önce onaylanmalıdır.");
    if (["CANCELLED", "CLOSED", "RECEIVED"].includes(order.status)) throw new Error("Kapalı sipariş gönderilemez.");

    await tx.purchaseApproval.create({
      data: {
        purchaseOrderId: id,
        action: "SENT_TO_SUPPLIER",
        status: "SENT",
        comment: "Satın alma siparişi tedarikçiye gönderildi olarak işaretlendi.",
        actedById: userId,
      },
    });

    return tx.purchaseOrder.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
  });
}

export async function updatePurchaseOrderDetails(
  id: string,
  input: {
    expectedDeliveryDate?: string;
    paymentTermDays?: number;
    externalReference?: string;
    notes?: string;
    invoiceStatus?: string;
    paymentStatus?: string;
  },
  userId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw new Error("Satın alma siparişi bulunamadı.");
    if (["CANCELLED", "CLOSED"].includes(order.status)) throw new Error("Arşivdeki sipariş düzenlenemez.");

    await tx.purchaseApproval.create({
      data: {
        purchaseOrderId: id,
        action: "UPDATED",
        status: order.status,
        comment: input.notes ? `Sipariş bilgileri güncellendi. Not: ${input.notes}` : "Sipariş bilgileri güncellendi.",
        actedById: userId,
      },
    });

    return tx.purchaseOrder.update({
      where: { id },
      data: {
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        paymentTermDays: input.paymentTermDays,
        externalReference: input.externalReference || null,
        notes: input.notes || null,
        invoiceStatus: input.invoiceStatus || undefined,
        paymentStatus: input.paymentStatus || undefined,
      },
    });
  });
}

export async function updatePurchaseOrderItem(
  id: string,
  input: { quantity: number; unitPrice: number; vatRate: number; discountRate: number; notes?: string },
  userId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const parent = await tx.purchaseOrderItem.findUniqueOrThrow({ where: { id }, select: { purchaseOrderId: true } });
    await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${parent.purchaseOrderId} FOR UPDATE`;
    const item = await tx.purchaseOrderItem.findUnique({
      where: { id },
      include: { purchaseOrder: { select: { id: true, status: true, currency: true } } },
    });
    if (!item) throw new Error("Satın alma kalemi bulunamadı.");
    assertPurchaseOrderEditable(item.purchaseOrder.status, Boolean(await tx.externalInvoice.count({ where: { purchaseOrderId: parent.purchaseOrderId } })));
    assertPurchaseQuantity(input.quantity, item.receivedQuantity);
    if (item.receivedQuantity > 0 && (item.unitPrice.toNumber() !== input.unitPrice || item.vatRate.toNumber() !== input.vatRate || item.discountRate.toNumber() !== input.discountRate)) {
      throw new Error("Teslim alınan kalemin fiyat ve vergi bilgisi değiştirilemez; yalnızca miktar ve not düzenlenebilir.");
    }

    const amounts = calculatePurchaseLine({
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      vatRate: input.vatRate,
      discountRate: input.discountRate,
    });

    await tx.purchaseOrderItem.update({
      where: { id },
      data: {
        orderedQuantity: input.quantity,
        remainingQuantity: Math.max(0, input.quantity - item.receivedQuantity),
        unitPrice: new Prisma.Decimal(input.unitPrice),
        vatRate: new Prisma.Decimal(input.vatRate),
        discountRate: new Prisma.Decimal(input.discountRate),
        lineSubtotal: new Prisma.Decimal(amounts.lineSubtotal),
        lineDiscount: new Prisma.Decimal(amounts.lineDiscount),
        lineVat: new Prisma.Decimal(amounts.lineVat),
        lineTotal: new Prisma.Decimal(amounts.lineTotal),
        notes: input.notes || null,
      },
    });

    const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: item.purchaseOrder.id } });
    const totals = calculatePurchaseTotals(items.map((line) => ({
      lineSubtotal: line.lineSubtotal.toNumber(),
      lineDiscount: line.lineDiscount.toNumber(),
      lineVat: line.lineVat.toNumber(),
      lineTotal: line.lineTotal.toNumber(),
    })));

    await tx.purchaseApproval.create({
      data: {
        purchaseOrderId: item.purchaseOrder.id,
        action: "ITEM_UPDATED",
        status: item.purchaseOrder.status,
        comment: `${item.productName} kalemi güncellendi.`,
        actedById: userId,
      },
    });

    await syncPurchaseOrderReceiptProgressInTx(tx, item.purchaseOrder.id);
    return tx.purchaseOrder.update({
      where: { id: item.purchaseOrder.id },
      data: {
        subtotal: new Prisma.Decimal(totals.subtotal),
        discountTotal: new Prisma.Decimal(totals.discountTotal),
        vatTotal: new Prisma.Decimal(totals.vatTotal),
        grandTotal: new Prisma.Decimal(totals.grandTotal),
      },
    });
  }, { timeout: 30_000, maxWait: 5_000 });
}

export async function changePurchaseOrderLine(
  orderId: string,
  change: { kind: "ADD"; input: unknown } | { kind: "REMOVE"; itemId: string },
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.purchaseOrder.findUniqueOrThrow({
      where: { id: orderId }, include: { items: true, externalInvoices: { select: { id: true } } },
    });
    assertPurchaseOrderEditable(order.status, order.externalInvoices.length > 0);
    let description: string;
    if (change.kind === "ADD") {
      const data = purchaseOrderLineSchema.parse(change.input);
      if (order.items.some((item) => item.productId === data.productId)) throw new Error("Ürün zaten siparişte var. Mevcut kalemin miktarını düzenleyin.");
      const product = await tx.product.findFirstOrThrow({ where: { id: data.productId, isActive: true, archivedAt: null } });
      const amounts = calculatePurchaseLine(data);
      await tx.purchaseOrderItem.create({ data: {
        purchaseOrderId: order.id, productId: product.id, productName: product.name, sku: product.sku, unit: product.unit,
        orderedQuantity: data.quantity, remainingQuantity: data.quantity,
        unitPrice: new Prisma.Decimal(data.unitPrice), vatRate: new Prisma.Decimal(data.vatRate),
        discountRate: new Prisma.Decimal(data.discountRate),
        lineSubtotal: new Prisma.Decimal(amounts.lineSubtotal), lineDiscount: new Prisma.Decimal(amounts.lineDiscount),
        lineVat: new Prisma.Decimal(amounts.lineVat), lineTotal: new Prisma.Decimal(amounts.lineTotal),
        notes: data.notes || null,
      } });
      description = `${product.name} siparişe eklendi: ${data.quantity} ${product.unit}.`;
    } else {
      const item = order.items.find((line) => line.id === change.itemId);
      if (!item) throw new Error("Sipariş kalemi bulunamadı.");
      if (order.items.length <= 1) throw new Error("Siparişin son ürünü çıkarılamaz. Gerekirse siparişi iptal edin.");
      const receiptHistory = await tx.goodsReceiptItem.count({ where: { productId: item.productId, goodsReceipt: { purchaseOrderId: order.id } } });
      if (item.receivedQuantity > 0 || receiptHistory > 0) throw new Error("Mal kabul geçmişi olan ürün çıkarılamaz.");
      await tx.purchaseOrderItem.delete({ where: { id: item.id } });
      description = `${item.productName} siparişten çıkarıldı.`;
    }
    const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
    const totals = calculatePurchaseTotals(items.map((item) => ({
      lineSubtotal: item.lineSubtotal.toNumber(), lineDiscount: item.lineDiscount.toNumber(),
      lineVat: item.lineVat.toNumber(), lineTotal: item.lineTotal.toNumber(),
    })));
    await tx.purchaseOrder.update({ where: { id: order.id }, data: {
      subtotal: new Prisma.Decimal(totals.subtotal), discountTotal: new Prisma.Decimal(totals.discountTotal),
      vatTotal: new Prisma.Decimal(totals.vatTotal), grandTotal: new Prisma.Decimal(totals.grandTotal),
    } });
    await tx.purchaseApproval.create({ data: {
      purchaseOrderId: order.id, action: change.kind === "ADD" ? "ITEM_ADDED" : "ITEM_REMOVED",
      status: order.status, comment: description, actedById: userId,
    } });
    return syncPurchaseOrderReceiptProgressInTx(tx, order.id);
  }, { timeout: 30_000, maxWait: 5_000 });
}

export async function closePurchaseOrder(id: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    await tx.purchaseApproval.create({
      data: {
        purchaseOrderId: id,
        action: "CLOSED",
        status: "CLOSED",
        comment: "Satın alma siparişi kapatıldı.",
        actedById: userId,
      },
    });

    return tx.purchaseOrder.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
  });
}

export async function cancelPurchaseOrder(id: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    await tx.purchaseApproval.create({
      data: {
        purchaseOrderId: id,
        action: "CANCELLED",
        status: "CANCELLED",
        comment: "Satın alma siparişi iptal edildi.",
        actedById: userId,
      },
    });

    return tx.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED", approvalStatus: "CANCELLED", cancelledAt: new Date() },
    });
  });
}

export async function upsertSupplierProduct(input: SupplierProductInput) {
  const data = supplierProductSchema.parse(input);
  return prisma.supplierProduct.upsert({
    where: { supplierId_productId: { supplierId: data.supplierId, productId: data.productId } },
    create: {
      ...data,
      unitPrice: data.unitPrice == null ? undefined : new Prisma.Decimal(data.unitPrice),
      lastQuotedAt: data.unitPrice == null ? undefined : new Date(),
    },
    update: {
      ...data,
      unitPrice: data.unitPrice == null ? undefined : new Prisma.Decimal(data.unitPrice),
      lastQuotedAt: data.unitPrice == null ? undefined : new Date(),
    },
  });
}

export async function syncPurchaseOrderReceiptProgress(purchaseOrderId: string) {
  return prisma.$transaction(async (tx) => {
    return syncPurchaseOrderReceiptProgressInTx(tx, purchaseOrderId);
  });
}

async function syncPurchaseOrderReceiptProgressInTx(tx: Prisma.TransactionClient, purchaseOrderId: string) {
  const order = await tx.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      items: true,
      goodsReceipts: {
        include: { items: true },
        where: { status: { not: "CANCELLED" } },
      },
      externalInvoices: { select: { id: true } },
    },
  });
  if (!order) return null;

  let anyReceived = false;
  let allReceived = true;

  for (const item of order.items) {
    const receivedQuantity = order.goodsReceipts.reduce((sum, receipt) => {
      return sum + receipt.items
        .filter((receiptItem) => receiptItem.productId === item.productId)
        .reduce((lineSum, receiptItem) => lineSum + receiptItem.acceptedQuantity, 0);
    }, 0);
    const remainingQuantity = Math.max(0, item.orderedQuantity - receivedQuantity);
    anyReceived = anyReceived || receivedQuantity > 0;
    allReceived = allReceived && remainingQuantity <= 0;
    await tx.purchaseOrderItem.update({
      where: { id: item.id },
      data: { receivedQuantity, remainingQuantity },
    });
  }

  const status = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : order.status;
  return tx.purchaseOrder.update({
    where: { id: order.id },
    data: {
      status,
      invoiceStatus: order.externalInvoices.length ? "RECEIVED" : order.invoiceStatus,
      closedAt: allReceived ? new Date() : order.closedAt,
    },
  });
}
