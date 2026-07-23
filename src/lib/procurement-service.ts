import { Prisma } from "@prisma/client";

import { calculatePurchaseLine, calculatePurchaseTotals, purchaseOrderNumber } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";
import { purchaseOrderSchema, supplierProductSchema } from "@/lib/validations/procurement";

type PurchaseOrderInput = Parameters<typeof purchaseOrderSchema.parse>[0];
type SupplierProductInput = Parameters<typeof supplierProductSchema.parse>[0];

export async function createPurchaseOrder(input: PurchaseOrderInput, userId?: string) {
  const data = purchaseOrderSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const [supplier, warehouse, products] = await Promise.all([
      tx.supplier.findFirst({ where: { id: data.supplierId, archivedAt: null } }),
      tx.warehouse.findFirst({ where: { id: data.warehouseId, archivedAt: null, isActive: true } }),
      tx.product.findMany({
        where: { id: { in: data.items.map((item) => item.productId) }, archivedAt: null, isActive: true },
      }),
    ]);

    if (!supplier) throw new Error("Tedarikçi bulunamadı.");
    if (!warehouse) throw new Error("Aktif depo bulunamadı.");
    if (products.length !== data.items.length) throw new Error("Siparişte aktif olmayan ürün var.");

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

    return order;
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
  });
}
