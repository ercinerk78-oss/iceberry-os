import { Prisma } from "@prisma/client";

import {
  INTEGRATION_DIRECTIONS,
  INTEGRATION_ERROR_CODES,
  INTEGRATION_PROVIDERS,
  MANUAL_REVIEW_REASONS,
  ORDER_FINANCIAL_STATUSES,
} from "@/lib/integrations/constants";
import {
  classifyIntegrationError,
  markEventFailure,
  markEventManualReview,
  markEventProcessing,
  markEventSuccess,
  receiveIntegrationEvent,
} from "@/lib/integrations/event-service";
import { idempotencyKey } from "@/lib/integrations/payload";
import { TicimaxClient } from "@/lib/integrations/ticimax/client";
import type { TicimaxOrderPayload, TicimaxWebhookPayload } from "@/lib/integrations/ticimax/types";
import { prisma } from "@/lib/prisma";
import { orderNumber } from "@/lib/warehouse";

export class TicimaxOrderService {
  private readonly client = new TicimaxClient();

  async handleWebhook(payload: TicimaxWebhookPayload) {
    const eventType = payload.eventType ?? "ORDER_UPDATED";
    const externalEntityId = payload.order?.id ?? payload.orderId ?? payload.orderNumber;
    if (!externalEntityId) throw new Error("Ticimax webhook içinde orderId veya orderNumber yok.");

    const event = await receiveIntegrationEvent({
      provider: INTEGRATION_PROVIDERS.TICIMAX,
      eventType,
      direction: INTEGRATION_DIRECTIONS.INBOUND,
      externalEventId: payload.eventId,
      externalEntityId,
      idempotencyKey: idempotencyKey(INTEGRATION_PROVIDERS.TICIMAX, eventType, externalEntityId, payload.version ?? payload.order?.version ?? "v1"),
      requestPayload: payload,
    });

    if (event.status === "SUCCESS") return event;

    await markEventProcessing(event.id);
    try {
      const order = payload.order ?? await this.client.getOrder(externalEntityId);
      const result = await this.importOrder(order);
      await markEventSuccess(event.id, { internalEntityType: "FranchiseOrder", internalEntityId: result.orderId, responsePayload: result });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ticimax siparişi işlenemedi.";
      const code = classifyIntegrationError(error);
      if (message.includes("Şube Eşleştirme")) {
        await markEventManualReview(event.id, INTEGRATION_ERROR_CODES.BRANCH_MAPPING_ERROR, message);
      } else if (message.includes("Ürün Eşleştirme")) {
        await markEventManualReview(event.id, INTEGRATION_ERROR_CODES.PRODUCT_MAPPING_ERROR, message);
      } else if (message.includes("CURRENCY_ERROR")) {
        await markEventManualReview(event.id, INTEGRATION_ERROR_CODES.CURRENCY_ERROR, message);
      } else {
        await markEventFailure(event.id, code, message);
      }
      throw error;
    }
  }

  async importOrder(input: TicimaxOrderPayload) {
    const existing = await prisma.franchiseOrder.findFirst({
      where: { OR: [{ source: "TICIMAX", externalOrderId: input.id }, { ticimaxOrderNumber: input.orderNumber }] },
      select: { id: true, status: true },
    });
    if (existing) return { orderId: existing.id, status: "EXISTING" };

    const branchId = await matchBranch(input);
    if (!branchId) {
      await queueBranchMapping(input);
      throw new Error(`${MANUAL_REVIEW_REASONS.BRANCH_MAPPING_REQUIRED}: ${input.customerName ?? input.customerId ?? input.orderNumber}`);
    }

    const products = await matchProducts(input);
    if (products.some((item) => !item.productId)) {
      await queueProductMappings(input, products);
      throw new Error(`${MANUAL_REVIEW_REASONS.PRODUCT_MAPPING_REQUIRED}: ${input.orderNumber}`);
    }

    if ((input.currency ?? "TRY") !== "TRY") throw new Error(`CURRENCY_ERROR: Desteklenmeyen para birimi ${input.currency}`);

    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { franchiseeId: true } });
    const franchiseeId = branch?.franchiseeId ?? await fallbackFranchiseeId();
    const warehouseId = await fallbackWarehouseId();
    if (!franchiseeId || !warehouseId) throw new Error("Sipariş için franchisee veya depo bulunamadı.");

    const lines = input.lines.map((line, index) => {
      const product = products[index];
      if (!product.productId) throw new Error("Ürün eşleştirme hatası.");
      const lineSubtotal = new Prisma.Decimal(line.unitPrice).mul(line.quantity);
      const lineVat = lineSubtotal.mul(line.vatRate).div(100);

      return {
        productId: product.productId,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: line.quantity,
        approvedQuantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        lineSubtotal: lineSubtotal.toNumber(),
        lineVat: lineVat.toNumber(),
        lineTotal: lineSubtotal.plus(lineVat).toNumber(),
      };
    });

    const created = await prisma.franchiseOrder.create({
      data: {
        orderNumber: orderNumber(),
        franchiseeId,
        branchId,
        warehouseId,
        customerName: input.customerName,
        source: "TICIMAX",
        orderType: "FRANCHISE_SALE",
        externalOrderId: input.id,
        ticimaxOrderNumber: input.orderNumber,
        subtotal: input.subtotal,
        vatTotal: input.vatTotal,
        grandTotal: input.grandTotal,
        currency: input.currency ?? "TRY",
        invoiceStatus: "PENDING_MATCH",
        financialStatus: ORDER_FINANCIAL_STATUSES.INVOICE_PENDING,
        createdBy: "Ticimax",
        notes: "Ticimax siparişi otomatik aktarıldı.",
        items: { create: lines },
        activities: { create: { type: "TICIMAX_ORDER_IMPORTED", description: `${input.orderNumber} Ticimax siparişi aktarıldı.`, createdBy: "Ticimax" } },
      },
      select: { id: true },
    });

    return { orderId: created.id, status: "IMPORTED" };
  }
}

async function matchBranch(input: TicimaxOrderPayload) {
  const externalCustomerId = input.customerId ?? input.dealerId ?? input.storeId;
  if (externalCustomerId) {
    const mapping = await prisma.externalBranchMapping.findFirst({
      where: { sourceSystem: "TICIMAX", externalCustomerId, status: "ACTIVE" },
      select: { branchId: true },
    });
    if (mapping) return mapping.branchId;
  }

  const branch = await prisma.branch.findFirst({
    where: {
      archivedAt: null,
      OR: [
        input.taxNumber ? { taxNumber: input.taxNumber } : undefined,
        input.email ? { email: input.email } : undefined,
        input.phone ? { phone: input.phone } : undefined,
        input.branchName ? { branchName: { contains: input.branchName } } : undefined,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    },
    select: { id: true },
  });

  return branch?.id ?? null;
}

async function matchProducts(input: TicimaxOrderPayload) {
  return Promise.all(input.lines.map(async (line) => {
    const mapping = line.externalProductId
      ? await prisma.externalProductMapping.findFirst({
          where: { sourceSystem: "TICIMAX", externalProductId: line.externalProductId, isActive: true },
          include: { product: true },
        })
      : null;
    const product = mapping?.product ?? await prisma.product.findFirst({
      where: {
        archivedAt: null,
        isActive: true,
        OR: [
          line.externalProductId ? { ticimaxProductId: line.externalProductId } : undefined,
          line.sku ? { sku: line.sku } : undefined,
          line.barcode ? { barcode: line.barcode } : undefined,
        ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
      },
    });

    return product ? { productId: product.id, name: product.name, sku: product.sku, unit: product.unit } : { productId: null, name: line.name, sku: line.sku ?? "", unit: "ADET" };
  }));
}

async function queueBranchMapping(input: TicimaxOrderPayload) {
  const externalCustomerId = input.customerId ?? input.dealerId ?? input.storeId;
  if (!externalCustomerId) return;
  await prisma.integrationEvent.upsert({
    where: { idempotencyKey: idempotencyKey("TICIMAX", "BRANCH_MAPPING_REQUIRED", externalCustomerId) },
    create: {
      provider: "TICIMAX",
      eventType: "BRANCH_MAPPING_REQUIRED",
      direction: "INBOUND",
      externalEntityId: externalCustomerId,
      idempotencyKey: idempotencyKey("TICIMAX", "BRANCH_MAPPING_REQUIRED", externalCustomerId),
      status: "MANUAL_REVIEW",
      errorCode: "BRANCH_MAPPING_ERROR",
      errorMessage: MANUAL_REVIEW_REASONS.BRANCH_MAPPING_REQUIRED,
    },
    update: { status: "MANUAL_REVIEW", updatedAt: new Date() },
  });
}

async function queueProductMappings(input: TicimaxOrderPayload, products: Awaited<ReturnType<typeof matchProducts>>) {
  for (const [index, product] of products.entries()) {
    if (product.productId) continue;
    const line = input.lines[index];
    await prisma.productMappingQueue.create({
      data: {
        sourceSystem: "TICIMAX",
        externalProductId: line.externalProductId,
        externalName: line.name,
        externalSku: line.sku,
        externalBarcode: line.barcode,
        externalUnit: product.unit,
        sourceOrderId: input.orderNumber,
      },
    }).catch(() => null);
  }
}

async function fallbackFranchiseeId() {
  const franchisee = await prisma.franchisee.findFirst({ where: { archivedAt: null }, select: { id: true }, orderBy: { createdAt: "asc" } });
  return franchisee?.id ?? null;
}

async function fallbackWarehouseId() {
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true }, select: { id: true }, orderBy: { createdAt: "asc" } });
  return warehouse?.id ?? null;
}
