import { Prisma } from "@prisma/client";

import { calculatePurchaseLine, calculatePurchaseTotals, purchaseOrderNumber, purchaseRequestNumber } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";
import { increaseStock } from "@/lib/stock-service";
import { goodsReceiptSchema, purchaseOrderSchema, purchaseRequestSchema, supplierProductSchema } from "@/lib/validations/procurement";

type PurchaseOrderInput = Parameters<typeof purchaseOrderSchema.parse>[0];
type PurchaseRequestInput = Parameters<typeof purchaseRequestSchema.parse>[0];
type GoodsReceiptInput = Parameters<typeof goodsReceiptSchema.parse>[0];
type SupplierProductInput = Parameters<typeof supplierProductSchema.parse>[0];

export async function createPurchaseRequest(input: PurchaseRequestInput, userId?: string) {
  const data = purchaseRequestSchema.parse(input);

  return prisma.$transaction(async (tx) => {
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

    const request = await tx.purchaseRequest.create({
      data: {
        requestNumber: purchaseRequestNumber(),
        title: data.title,
        warehouseId: warehouse.id,
        supplierId: supplier?.id,
        status: "SUBMITTED",
        priority: data.priority,
        requestedById: userId,
        neededByDate: data.neededByDate ? new Date(data.neededByDate) : null,
        notes: data.notes || null,
        items: {
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
              notes: item.notes || null,
            };
          }),
        },
        approvals: {
          create: {
            action: "SUBMITTED",
            status: "SUBMITTED",
            comment: "Depo satın alma talebi oluşturdu.",
            actedById: userId,
          },
        },
      },
      select: { id: true, requestNumber: true },
    });

    return request;
  });
}

export async function createPurchaseOrder(input: PurchaseOrderInput, userId?: string) {
  const data = purchaseOrderSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const [supplier, warehouse, sourceRequest, products] = await Promise.all([
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
    ]);

    if (!supplier) throw new Error("Tedarikçi bulunamadı.");
    if (!warehouse) throw new Error("Aktif depo bulunamadı.");
    if (products.length !== data.items.length) throw new Error("Siparişte aktif olmayan ürün var.");
    if (data.sourceRequestId && !sourceRequest) throw new Error("Satın alma talebi bulunamadı.");
    if (sourceRequest?.purchaseOrder) throw new Error("Bu talep daha önce siparişe dönüştürülmüş.");
    if (sourceRequest && ["CANCELLED", "REJECTED", "CONVERTED"].includes(sourceRequest.status)) {
      throw new Error("Kapalı talep siparişe dönüştürülemez.");
    }

    const lines = data.items.map((item) => {
      const product = products.find((row) => row.id === item.productId);
      if (!product) throw new Error("Ürün bulunamadı.");
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
    const order = await tx.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
      include: { items: true, supplier: true, warehouse: true },
    });
    if (!order) throw new Error("Satın alma siparişi bulunamadı.");
    if (["CANCELLED", "CLOSED"].includes(order.status)) throw new Error("Kapalı sipariş için mal kabul yapılamaz.");

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
    return receipt;
  });
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
        .reduce((lineSum, receiptItem) => lineSum + (receiptItem.acceptedQuantity || receiptItem.receivedQuantity || 0), 0);
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
