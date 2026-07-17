import { accountingService } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";
import { reserveStock, releaseReservation, shipReservedStock } from "@/lib/stock-service";
import { orderNumber } from "@/lib/warehouse";
import { orderSchema } from "@/lib/validations/order";

type Input = Parameters<typeof orderSchema.parse>[0];

export async function createOrder(input: Input) {
  const data = orderSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: data.items.map((item) => item.productId) }, isActive: true, archivedAt: null },
    });
    if (products.length !== data.items.length) throw new Error("Sepette artık satışta olmayan ürün var.");

    const stocks = await tx.warehouseStock.findMany({
      where: { warehouseId: data.warehouseId, productId: { in: products.map((product) => product.id) } },
    });
    for (const item of data.items) {
      const stock = stocks.find((row) => row.productId === item.productId);
      if (!stock || stock.availableQuantity < item.quantity) {
        throw new Error(`${products.find((product) => product.id === item.productId)?.name} için yeterli kullanılabilir stok yok.`);
      }
    }

    const lines = data.items.map((item) => {
      const product = products.find((row) => row.id === item.productId);
      if (!product) throw new Error("Ürün bulunamadı.");
      const lineSubtotal = product.salePrice * item.quantity;
      const lineVat = (lineSubtotal * product.vatRate) / 100;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: item.quantity,
        approvedQuantity: item.quantity,
        unitPrice: product.salePrice,
        vatRate: product.vatRate,
        lineSubtotal,
        lineVat,
        lineTotal: lineSubtotal + lineVat,
      };
    });
    const subtotal = lines.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const vatTotal = lines.reduce((sum, item) => sum + item.lineVat, 0);

    return tx.franchiseOrder.create({
      data: {
        orderNumber: orderNumber(),
        franchiseeId: data.franchiseeId,
        branchId: data.branchId || null,
        warehouseId: data.warehouseId,
        source: "MANUAL_OTHER",
        orderType: "FRANCHISE_SALE",
        subtotal,
        vatTotal,
        grandTotal: subtotal + vatTotal,
        requestedDeliveryDate: data.requestedDeliveryDate ? new Date(data.requestedDeliveryDate) : null,
        notes: data.notes,
        createdBy: "Iceberry OS",
        items: { create: lines },
        activities: { create: { type: "ORDER_CREATED", description: "Sipariş incelemeye gönderildi.", createdBy: "Iceberry OS" } },
      },
    });
  });
}

export async function approveOrder(id: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.franchiseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (order.status !== "SUBMITTED") return order;

    for (const item of order.items) {
      await reserveStock(tx, {
        warehouseId: order.warehouseId,
        productId: item.productId,
        quantity: item.quantity,
        referenceType: "ORDER",
        referenceId: id,
        description: `${order.orderNumber} için rezerve edildi.`,
      });
      await tx.franchiseOrderItem.update({
        where: { id: item.id },
        data: { reservedQuantity: item.quantity, approvedQuantity: item.quantity },
      });
    }

    return tx.franchiseOrder.update({
      where: { id },
      data: {
        status: "STOCK_RESERVED",
        approvedAt: new Date(),
        reservedAt: new Date(),
        approvedBy: "Iceberry OS",
        activities: { create: { type: "ORDER_RESERVED", description: "Sipariş onaylandı ve stok rezerve edildi." } },
      },
    });
  });
}

export async function createInvoice(id: string) {
  const order = await prisma.franchiseOrder.findUnique({ where: { id }, include: { franchisee: true, items: true } });
  if (!order) throw new Error("Sipariş bulunamadı.");
  if (order.parasutInvoiceId) return order;

  const accounting = accountingService();
  await accounting.findOrCreateContact(order.franchisee.companyName, order.franchisee.taxNumber);
  for (const item of order.items) await accounting.findOrCreateProduct({ name: item.productName, sku: item.sku });
  const invoice = await accounting.createSalesInvoice({
    orderId: id,
    orderNumber: order.orderNumber,
    contactName: order.franchisee.companyName,
    total: order.grandTotal,
    currency: order.currency,
  });

  return prisma.franchiseOrder.update({
    where: { id },
    data: {
      invoiceStatus: "CREATED",
      parasutInvoiceId: invoice.id,
      parasutInvoiceNumber: invoice.number,
      activities: { create: { type: "INVOICE_CREATED", description: `Mock satış faturası oluşturuldu: ${invoice.number}` } },
    },
  });
}

export async function changeOrderStatus(id: string, status: string) {
  return prisma.franchiseOrder.update({
    where: { id },
    data: { status, activities: { create: { type: "STATUS_CHANGED", description: `Sipariş durumu ${status} olarak güncellendi.` } } },
  });
}

export async function releaseOrder(id: string, status: "REJECTED" | "CANCELLED") {
  return prisma.$transaction(async (tx) => {
    const order = await tx.franchiseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (["REJECTED", "CANCELLED", "SHIPPED", "DELIVERED"].includes(order.status)) return order;

    if (["APPROVED", "STOCK_RESERVED", "WAREHOUSE_QUEUE", "PREPARING", "READY"].includes(order.status)) {
      for (const item of order.items) {
        await releaseReservation(tx, {
          warehouseId: order.warehouseId,
          productId: item.productId,
          quantity: item.reservedQuantity || item.quantity,
          referenceType: "ORDER",
          referenceId: id,
          description: "Sipariş kapatıldığı için rezervasyon iade edildi.",
        });
        await tx.franchiseOrderItem.update({ where: { id: item.id }, data: { reservedQuantity: 0 } });
      }
    }

    return tx.franchiseOrder.update({
      where: { id },
      data: {
        status,
        [status === "REJECTED" ? "rejectedAt" : "cancelledAt"]: new Date(),
        activities: { create: { type: "STATUS_CHANGED", description: status === "REJECTED" ? "Sipariş reddedildi." : "Sipariş iptal edildi." } },
      },
    });
  });
}

export async function prepareOrder(id: string, items: { id: string; preparedQuantity: number; missingQuantity: number }[]) {
  return prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.franchiseOrderItem.update({
        where: { id: item.id },
        data: { preparedQuantity: item.preparedQuantity, pickedQuantity: item.preparedQuantity, packedQuantity: item.preparedQuantity, missingQuantity: item.missingQuantity },
      });
    }

    return tx.franchiseOrder.update({
      where: { id },
      data: { status: "PREPARING", pickingStartedAt: new Date(), activities: { create: { type: "ORDER_PICKING_STARTED", description: "Depo hazırlık miktarları güncellendi." } } },
    });
  });
}

export async function shipOrder(id: string, carrierName?: string, trackingNumber?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.franchiseOrder.findUnique({ where: { id }, include: { items: true, shipment: true } });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (order.status === "SHIPPED") return order;
    if (order.invoiceStatus !== "CREATED") throw new Error("Fatura oluşmadan sevkiyat yapılamaz.");

    for (const item of order.items) {
      if (item.preparedQuantity + item.missingQuantity < item.quantity) throw new Error("Tüm kalemler kontrol edilmeden sevkiyat yapılamaz.");
      if (item.missingQuantity > 0) throw new Error("Eksik ürün bulunan sipariş sevk edilemez.");
      const shipQuantity = item.preparedQuantity || item.quantity;
      await shipReservedStock(tx, {
        warehouseId: order.warehouseId,
        productId: item.productId,
        quantity: shipQuantity,
        referenceType: "SHIPMENT",
        referenceId: id,
        description: `${order.orderNumber} sevkiyatı.`,
      });
      await tx.franchiseOrderItem.update({ where: { id: item.id }, data: { shippedQuantity: shipQuantity, reservedQuantity: 0 } });
    }

    const shipment = await tx.shipment.upsert({
      where: { orderId: id },
      create: { orderId: id, warehouseId: order.warehouseId, shipmentNumber: `SVK-${order.orderNumber}`, status: "SHIPPED", carrierName, trackingNumber, shippedAt: new Date() },
      update: { status: "SHIPPED", carrierName, trackingNumber, shippedAt: new Date() },
    });
    for (const item of order.items) {
      const shipQuantity = item.preparedQuantity || item.quantity;
      const shipmentItem = await tx.shipmentItem.findFirst({ where: { shipmentId: shipment.id, orderItemId: item.id }, select: { id: true } });
      if (shipmentItem) {
        await tx.shipmentItem.update({ where: { id: shipmentItem.id }, data: { shippedQuantity: shipQuantity } });
      } else {
        await tx.shipmentItem.create({ data: { shipmentId: shipment.id, orderItemId: item.id, productId: item.productId, packedQuantity: shipQuantity, shippedQuantity: shipQuantity } });
      }
    }

    return tx.franchiseOrder.update({
      where: { id },
      data: { status: "SHIPPED", shippedAt: new Date(), activities: { create: { type: "SHIPMENT_DISPATCHED", description: "Sipariş sevk edildi ve stoktan düşüldü." } } },
    });
  });
}
