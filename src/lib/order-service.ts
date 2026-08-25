import { upsertShipmentBackorder } from "@/lib/backorders";
import { ORDER_FINANCIAL_STATUSES } from "@/lib/integrations/constants";
import { ParasutInvoiceService } from "@/lib/integrations/parasut/invoice-service";
import { prisma } from "@/lib/prisma";
import { reserveStock, releaseReservation, shipReservedStock } from "@/lib/stock-service";
import { orderSchema } from "@/lib/validations/order";
import { orderNumber } from "@/lib/warehouse";

type Input = Parameters<typeof orderSchema.parse>[0];

export const MANUAL_PICKING_REASONS = {
  DAMAGED_BARCODE: "Barkod hasarlı",
  UNREADABLE_BARCODE: "Barkod okunmuyor",
  TEMPORARY_NO_BARCODE: "Geçici barkodsuz ürün",
  SYSTEM_ISSUE: "Sistem problemi",
  OTHER: "Diğer",
} as const;

const manualReasonKeys = Object.keys(MANUAL_PICKING_REASONS);

export async function createOrder(input: Input) {
  const data = orderSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: data.items.map((item) => item.productId) }, isActive: true, archivedAt: null },
    });

    if (products.length !== data.items.length) {
      throw new Error("Sepette artık satışta olmayan ürün var.");
    }

    const stocks = await tx.warehouseStock.findMany({
      where: { warehouseId: data.warehouseId, productId: { in: products.map((product) => product.id) } },
    });

    for (const item of data.items) {
      const stock = stocks.find((row) => row.productId === item.productId);

      if (!stock || stock.availableQuantity < item.quantity) {
        const productName = products.find((product) => product.id === item.productId)?.name;
        throw new Error(`${productName} için yeterli kullanılabilir stok yok.`);
      }
    }

    const lines = data.items.map((item) => {
      const product = products.find((row) => row.id === item.productId);

      if (!product) {
        throw new Error("Ürün bulunamadı.");
      }

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
        invoiceStatus: data.invoicePreference === "NOT_REQUIRED" ? "NOT_REQUIRED" : "PENDING_MATCH",
        financialStatus:
          data.invoicePreference === "NOT_REQUIRED"
            ? ORDER_FINANCIAL_STATUSES.INVOICE_NOT_REQUIRED
            : ORDER_FINANCIAL_STATUSES.INVOICE_PENDING,
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

    if (!order) {
      throw new Error("Sipariş bulunamadı.");
    }
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
  await new ParasutInvoiceService().createSalesInvoiceForOrder(id);
  return prisma.franchiseOrder.findUniqueOrThrow({ where: { id } });
}

export async function changeOrderStatus(id: string, status: string) {
  return prisma.franchiseOrder.update({
    where: { id },
    data: { status, activities: { create: { type: "STATUS_CHANGED", description: `Sipariş durumu ${status} olarak güncellendi.` } } },
  });
}

export async function scanOrderBarcode(orderId: string, barcodeInput: string, userId?: string) {
  const barcode = barcodeInput.trim();
  if (!barcode) throw new Error("Barkod okutmalısınız.");

  return prisma.$transaction(async (tx) => {
    const order = await tx.franchiseOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
              },
            },
          },
        },
      },
    });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (["SHIPPED", "DELIVERED", "CANCELLED", "REJECTED"].includes(order.status)) {
      throw new Error("Kapalı sipariş için barkod okutulamaz.");
    }

    const item = order.items.find((row) => row.product.barcode === barcode);
    if (!item) {
      const product = await tx.product.findUnique({ where: { barcode }, select: { id: true } });
      throw new Error(product ? "Bu ürün siparişte bulunmuyor." : "Bu barkod sistemde tanımlı değil.");
    }
    if (!item.product.barcode) throw new Error("Bu ürün için barkod tanımlanmamış.");
    if (item.pickedQuantity >= item.quantity) throw new Error("Sipariş miktarı aşılamaz.");

    const nextPickedQuantity = item.pickedQuantity + 1;
    const nextMissingQuantity = Math.max(0, item.quantity - nextPickedQuantity);

    await tx.franchiseOrderItem.update({
      where: { id: item.id },
      data: {
        pickedQuantity: nextPickedQuantity,
        preparedQuantity: nextPickedQuantity,
        missingQuantity: nextMissingQuantity,
      },
    });

    await tx.orderPickingScan.create({
      data: {
        orderId: order.id,
        orderItemId: item.id,
        productId: item.productId,
        barcode,
        quantity: 1,
        scannedById: userId,
        scanType: "BARCODE_SCAN",
        note: `${item.productName} barkodla hazırlandı.`,
      },
    });

    await tx.franchiseOrder.update({
      where: { id: order.id },
      data: {
        status: "PREPARING",
        pickingStartedAt: order.pickingStartedAt ?? new Date(),
        activities: {
          create: {
            type: "BARCODE_PICKED",
            description: `${item.productName} barkodu okutuldu. Hazırlanan: ${nextPickedQuantity}/${item.quantity}`,
            createdBy: userId,
          },
        },
      },
    });

    return { productName: item.productName, pickedQuantity: nextPickedQuantity, orderedQuantity: item.quantity };
  });
}

export async function overrideOrderPickingItem(input: {
  orderId: string;
  orderItemId: string;
  pickedQuantity: number;
  reason: string;
  note?: string;
  userId?: string;
}) {
  if (!manualReasonKeys.includes(input.reason)) throw new Error("Manuel işlem için geçerli bir neden seçmelisiniz.");
  if (input.pickedQuantity < 0) throw new Error("Hazırlanan miktar negatif olamaz.");
  const note = input.note?.trim();
  if (!note) throw new Error("Manuel işlem notu zorunludur.");

  return prisma.$transaction(async (tx) => {
    const item = await tx.franchiseOrderItem.findUnique({
      where: { id: input.orderItemId },
      include: { order: true, product: { select: { barcode: true } } },
    });
    if (!item || item.orderId !== input.orderId) throw new Error("Sipariş kalemi bulunamadı.");
    if (["SHIPPED", "DELIVERED", "CANCELLED", "REJECTED"].includes(item.order.status)) {
      throw new Error("Kapalı sipariş kalemi değiştirilemez.");
    }
    if (input.pickedQuantity > item.quantity) throw new Error("Sipariş miktarı aşılamaz.");

    const nextMissingQuantity = Math.max(0, item.quantity - input.pickedQuantity);
    const delta = input.pickedQuantity - item.pickedQuantity;
    await tx.franchiseOrderItem.update({
      where: { id: item.id },
      data: {
        pickedQuantity: input.pickedQuantity,
        preparedQuantity: input.pickedQuantity,
        missingQuantity: nextMissingQuantity,
      },
    });
    await tx.orderPickingScan.create({
      data: {
        orderId: item.orderId,
        orderItemId: item.id,
        productId: item.productId,
        barcode: item.product.barcode,
        quantity: delta,
        scannedById: input.userId,
        scanType: "MANUAL_OVERRIDE",
        note: `${MANUAL_PICKING_REASONS[input.reason as keyof typeof MANUAL_PICKING_REASONS]}: ${note}`,
      },
    });
    return tx.franchiseOrder.update({
      where: { id: item.orderId },
      data: {
        status: "PREPARING",
        pickingStartedAt: item.order.pickingStartedAt ?? new Date(),
        activities: {
          create: {
            type: "PICKING_MANUAL_OVERRIDE",
            description: `${item.productName} için manuel hazırlık miktarı ${input.pickedQuantity} olarak güncellendi.`,
            createdBy: input.userId,
          },
        },
      },
    });
  });
}

export async function confirmWarehouseControl(orderId: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.franchiseOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                barcode: true,
                stocks: { select: { warehouseId: true, quantity: true, reservedQuantity: true } },
              },
            },
            pickingScans: true,
          },
        },
      },
    });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (["SHIPPED", "DELIVERED", "CANCELLED", "REJECTED"].includes(order.status)) {
      throw new Error("Kapalı sipariş onaylanamaz.");
    }

    for (const item of order.items) {
      if (item.pickedQuantity > item.quantity) throw new Error(`${item.productName} için sipariş miktarı aşılamaz.`);
      const stock = item.product.stocks.find((row) => row.warehouseId === order.warehouseId);
      if ((stock?.quantity ?? 0) < item.pickedQuantity) throw new Error(`${item.productName} için fiziksel stok yetersiz.`);

      const barcodeScanTotal = item.pickingScans
        .filter((scan) => scan.scanType === "BARCODE_SCAN")
        .reduce((sum, scan) => sum + scan.quantity, 0);
      const hasManualOverride = item.pickingScans.some((scan) => scan.scanType === "MANUAL_OVERRIDE" && scan.note);

      if (item.product.barcode && item.pickedQuantity > barcodeScanTotal && !hasManualOverride) {
        throw new Error(`${item.productName} için barkod doğrulaması tamamlanmadı.`);
      }
      if (!item.product.barcode && item.pickedQuantity > 0 && !hasManualOverride) {
        throw new Error(`${item.productName} barkodsuz olduğu için manuel işlem gerekçesi zorunludur.`);
      }
    }

    for (const item of order.items) {
      const preparedQuantity = item.pickedQuantity;
      await tx.franchiseOrderItem.update({
        where: { id: item.id },
        data: {
          preparedQuantity,
          packedQuantity: preparedQuantity,
          missingQuantity: Math.max(0, item.quantity - preparedQuantity),
        },
      });
    }

    return tx.franchiseOrder.update({
      where: { id: order.id },
      data: {
        status: "READY",
        readyToShipAt: new Date(),
        packedAt: new Date(),
        activities: {
          create: {
            type: "WAREHOUSE_CONTROL_APPROVED",
            description: "Depo kontrolü onaylandı ve sipariş sevkiyata hazırlandı.",
            createdBy: userId,
          },
        },
      },
    });
  });
}

export async function releaseOrder(id: string, status: "REJECTED" | "CANCELLED") {
  return prisma.$transaction(async (tx) => {
    const order = await tx.franchiseOrder.findUnique({ where: { id }, include: { items: true } });

    if (!order) {
      throw new Error("Sipariş bulunamadı.");
    }
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
        data: {
          preparedQuantity: item.preparedQuantity,
          pickedQuantity: item.preparedQuantity,
          packedQuantity: item.preparedQuantity,
          missingQuantity: item.missingQuantity,
        },
      });
    }

    return tx.franchiseOrder.update({
      where: { id },
      data: {
        status: "PREPARING",
        pickingStartedAt: new Date(),
        activities: { create: { type: "ORDER_PICKING_STARTED", description: "Depo hazırlık miktarları güncellendi." } },
      },
    });
  });
}

export async function shipOrder(
  id: string,
  carrierName?: string,
  trackingNumber?: string,
  options?: { reason?: string; note?: string; expectedFulfillmentDate?: Date | null; createdById?: string },
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.franchiseOrder.findUnique({ where: { id }, include: { items: true, shipment: true } });

    if (!order) {
      throw new Error("Sipariş bulunamadı.");
    }
    if (order.status === "SHIPPED") return order;
    if (!order.readyToShipAt) {
      throw new Error("Depo kontrolü onaylanmadan sevkiyat yapılamaz.");
    }
    if (!["CREATED", "NOT_REQUIRED"].includes(order.invoiceStatus)) {
      throw new Error("Depo onaylı fatura oluşmadan sevkiyat yapılamaz.");
    }

    let hasShipmentQuantity = false;
    for (const item of order.items) {
      if (item.preparedQuantity + item.missingQuantity < item.quantity) {
        throw new Error("Tüm kalemler kontrol edilmeden sevkiyat yapılamaz.");
      }
      if (item.preparedQuantity > item.quantity) {
        throw new Error("Sevk miktarı sipariş miktarını aşamaz.");
      }

      const shipQuantity = Math.max(0, item.preparedQuantity - item.shippedQuantity);
      if (shipQuantity <= 0) continue;
      hasShipmentQuantity = true;
      await shipReservedStock(tx, {
        warehouseId: order.warehouseId,
        productId: item.productId,
        quantity: shipQuantity,
        referenceType: "SHIPMENT",
        referenceId: id,
        description: `${order.orderNumber} sevkiyatı.`,
      });
      await tx.franchiseOrderItem.update({
        where: { id: item.id },
        data: {
          shippedQuantity: item.shippedQuantity + shipQuantity,
          reservedQuantity: Math.max(0, item.reservedQuantity - shipQuantity),
        },
      });
    }
    if (!hasShipmentQuantity) throw new Error("Sevk edilecek yeni ürün miktarı yok.");

    const shipment = await tx.shipment.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        warehouseId: order.warehouseId,
        shipmentNumber: `SVK-${order.orderNumber}`,
        status: "SHIPPED",
        carrierName,
        trackingNumber,
        shippedAt: new Date(),
      },
      update: { status: "SHIPPED", carrierName, trackingNumber, shippedAt: new Date() },
    });

    for (const item of order.items) {
      const totalShippedQuantity = item.preparedQuantity;
      const shipmentItem = await tx.shipmentItem.findFirst({
        where: { shipmentId: shipment.id, orderItemId: item.id },
        select: { id: true },
      });

      if (shipmentItem) {
        await tx.shipmentItem.update({
          where: { id: shipmentItem.id },
          data: { packedQuantity: totalShippedQuantity, shippedQuantity: totalShippedQuantity },
        });
      } else {
        await tx.shipmentItem.create({
          data: {
            shipmentId: shipment.id,
            orderItemId: item.id,
            productId: item.productId,
            packedQuantity: totalShippedQuantity,
            shippedQuantity: totalShippedQuantity,
          },
        });
      }

      await upsertShipmentBackorder(tx, {
        orderId: order.id,
        orderItemId: item.id,
        shipmentId: shipment.id,
        branchId: order.branchId,
        productId: item.productId,
        orderedQuantity: item.quantity,
        shippedQuantity: totalShippedQuantity,
        unit: item.unit,
        reason: options?.reason,
        note: options?.note,
        expectedFulfillmentDate: options?.expectedFulfillmentDate ?? null,
        createdById: options?.createdById,
      });
    }

    const hasBackorder = order.items.some((item) => item.preparedQuantity < item.quantity);
    return tx.franchiseOrder.update({
      where: { id },
      data: {
        status: hasBackorder ? "BACKORDER_PENDING" : "SHIPPED",
        shippedAt: new Date(),
        activities: {
          create: {
            type: hasBackorder ? "SHIPMENT_PARTIAL_WITH_BACKORDER" : "SHIPMENT_DISPATCHED",
            description: hasBackorder ? "Sipariş kısmi sevk edildi; eksik ürünler borçlu ürün olarak açıldı." : "Sipariş sevk edildi ve stoktan düşüldü.",
          },
        },
      },
    });
  });
}
