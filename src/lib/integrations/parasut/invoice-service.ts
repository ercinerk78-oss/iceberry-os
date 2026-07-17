import { Prisma } from "@prisma/client";

import {
  INTEGRATION_DIRECTIONS,
  INTEGRATION_ERROR_CODES,
  INTEGRATION_PROVIDERS,
  MANUAL_REVIEW_REASONS,
  ORDER_FINANCIAL_STATUSES,
  RECONCILIATION_STATUSES,
} from "@/lib/integrations/constants";
import {
  classifyIntegrationError,
  markEventFailure,
  markEventManualReview,
  markEventProcessing,
  markEventSuccess,
  receiveIntegrationEvent,
} from "@/lib/integrations/event-service";
import { idempotencyKey, stringifyPayload } from "@/lib/integrations/payload";
import { ParasutClient } from "@/lib/integrations/parasut/client";
import type { ParasutInvoicePayload } from "@/lib/integrations/parasut/types";
import { BranchLedgerService } from "@/lib/finance/ledger-service";
import { prisma } from "@/lib/prisma";

const invoiceBlockedOrderTypes = ["INTERNAL_TRANSFER", "BRANCH_TRANSFER", "SAMPLE", "WAREHOUSE_TRANSFER"];

export class ParasutInvoiceService {
  private readonly client = new ParasutClient();

  async handleInvoiceWebhook(payload: { eventId?: string; invoiceId?: string; invoice?: ParasutInvoicePayload; version?: string }) {
    const invoiceId = payload.invoice?.id ?? payload.invoiceId;
    if (!invoiceId) throw new Error("Paraşüt webhook içinde invoiceId yok.");
    const eventType = payload.invoice?.invoiceType === "PURCHASE" ? "PURCHASE_INVOICE_RECEIVED" : "SALES_INVOICE_RECEIVED";
    const event = await receiveIntegrationEvent({
      provider: INTEGRATION_PROVIDERS.PARASUT,
      eventType,
      direction: INTEGRATION_DIRECTIONS.INBOUND,
      externalEventId: payload.eventId,
      externalEntityId: invoiceId,
      idempotencyKey: idempotencyKey(INTEGRATION_PROVIDERS.PARASUT, eventType, invoiceId, payload.version ?? "v1"),
      requestPayload: payload,
    });
    if (event.status === "SUCCESS") return event;

    await markEventProcessing(event.id);
    try {
      const invoice = payload.invoice ?? await this.client.getInvoice(invoiceId);
      const result = invoice.invoiceType === "PURCHASE"
        ? await this.receivePurchaseInvoice(invoice)
        : await this.receiveSalesInvoice(invoice);
      await markEventSuccess(event.id, { internalEntityType: result.entityType, internalEntityId: result.entityId, responsePayload: result });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Paraşüt faturası işlenemedi.";
      const code = classifyIntegrationError(error);
      if (message.includes("Bekliyor") || code === INTEGRATION_ERROR_CODES.PRODUCT_MAPPING_ERROR) {
        await markEventManualReview(event.id, code, message);
      } else {
        await markEventFailure(event.id, code, message);
      }
      throw error;
    }
  }

  async receiveSalesInvoice(invoice: ParasutInvoicePayload) {
    const saved = await upsertExternalInvoice(invoice);
    const order = await matchOrderForInvoice(invoice);
    if (!order) {
      await createReconciliation({
        type: "SALES_ORDER_INVOICE",
        status: RECONCILIATION_STATUSES.ORDER_MISSING,
        externalInvoiceId: saved.id,
        externalAmount: invoice.total,
        currency: invoice.currency ?? "TRY",
        details: MANUAL_REVIEW_REASONS.INVOICE_MATCH_REQUIRED,
      });
      throw new Error(MANUAL_REVIEW_REASONS.INVOICE_MATCH_REQUIRED);
    }

    const total = new Prisma.Decimal(invoice.total);
    const orderTotal = new Prisma.Decimal(order.grandTotal);
    const status = total.equals(orderTotal) && (invoice.currency ?? "TRY") === order.currency
      ? ORDER_FINANCIAL_STATUSES.INVOICE_MATCHED
      : ORDER_FINANCIAL_STATUSES.INVOICE_MISMATCH;

    await prisma.franchiseOrder.update({
      where: { id: order.id },
      data: {
        parasutInvoiceId: invoice.id,
        parasutInvoiceNumber: invoice.invoiceNumber,
        invoiceStatus: invoice.status ?? "RECEIVED",
        financialStatus: status,
        invoicedAt: invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(),
        invoiceTotal: total,
        invoiceCurrency: invoice.currency ?? "TRY",
        activities: { create: { type: "INVOICE_MATCHED_TO_ORDER", description: `${invoice.invoiceNumber ?? invoice.id} faturası siparişle eşleştirildi.` } },
      },
    });
    await prisma.externalInvoice.update({ where: { id: saved.id }, data: { orderId: order.id, matchedAt: new Date(), status: status === ORDER_FINANCIAL_STATUSES.INVOICE_MATCHED ? "MATCHED" : "MISMATCH" } });
    await createReconciliation({
      type: "SALES_ORDER_INVOICE",
      status: status === ORDER_FINANCIAL_STATUSES.INVOICE_MATCHED ? RECONCILIATION_STATUSES.MATCHED : RECONCILIATION_STATUSES.AMOUNT_MISMATCH,
      orderId: order.id,
      externalInvoiceId: saved.id,
      internalAmount: order.grandTotal,
      externalAmount: invoice.total,
      currency: invoice.currency ?? order.currency,
      details: status,
    });
    if (order.branchId && order.orderType === "FRANCHISE_SALE") {
      await createLedgerDebitForSalesInvoice({
        branchId: order.branchId,
        invoiceId: saved.id,
        orderId: order.id,
        amount: invoice.total,
        currency: invoice.currency ?? order.currency,
        invoiceNumber: invoice.invoiceNumber ?? invoice.id,
      });
    }

    return { entityType: "FranchiseOrder", entityId: order.id };
  }

  async receivePurchaseInvoice(invoice: ParasutInvoicePayload) {
    const saved = await upsertExternalInvoice(invoice);
    const existingReceipt = await prisma.goodsReceipt.findFirst({
      where: { sourceSystem: "PARASUT", externalDocumentId: invoice.id },
      select: { id: true },
    });
    if (existingReceipt) return { entityType: "GoodsReceipt", entityId: existingReceipt.id };

    const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true }, select: { id: true }, orderBy: { createdAt: "asc" } });
    if (!warehouse) throw new Error("Aktif depo bulunamadı.");
    const supplierId = await matchSupplier(invoice);
    if (!supplierId) throw new Error(MANUAL_REVIEW_REASONS.SUPPLIER_MAPPING_REQUIRED);

    const items = await Promise.all(invoice.lines.map(async (line) => {
      const product = await matchParasutProduct(line.externalProductId, line.sku, line.barcode);
      if (!product) {
        await prisma.productMappingQueue.create({
          data: {
            sourceSystem: "PARASUT",
            externalProductId: line.externalProductId,
            externalName: line.name,
            externalSku: line.sku,
            externalBarcode: line.barcode,
            externalUnit: line.unit,
            sourceDocumentId: invoice.id,
          },
        }).catch(() => null);
      }

      return {
        productId: product?.id,
        externalProductId: line.externalProductId,
        expectedQuantity: line.quantity,
        unit: line.unit,
        unitCost: line.unitPrice,
        notes: product ? undefined : MANUAL_REVIEW_REASONS.PRODUCT_MAPPING_REQUIRED,
      };
    }));

    if (items.some((item) => !item.productId)) throw new Error(MANUAL_REVIEW_REASONS.PRODUCT_MAPPING_REQUIRED);

    const receipt = await prisma.goodsReceipt.create({
      data: {
        warehouseId: warehouse.id,
        supplierId,
        sourceSystem: "PARASUT",
        externalDocumentId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : null,
        status: "PENDING_RECEIPT",
        totalExpectedItems: invoice.lines.reduce((sum, line) => sum + line.quantity, 0),
        notes: "Paraşüt alış faturasıyla bekleyen mal kabul oluşturuldu. Fiziksel stok artırılmadı.",
        items: { create: items },
      },
      select: { id: true },
    });
    await prisma.externalInvoice.update({ where: { id: saved.id }, data: { goodsReceiptId: receipt.id, matchedAt: new Date(), status: "GOODS_RECEIPT_PENDING" } });
    await createReconciliation({
      type: "PURCHASE_INVOICE_GOODS_RECEIPT",
      status: "MANUAL_REVIEW",
      goodsReceiptId: receipt.id,
      externalInvoiceId: saved.id,
      externalAmount: invoice.total,
      currency: invoice.currency ?? "TRY",
      details: "Fiziksel mal kabul bekleniyor.",
    });

    return { entityType: "GoodsReceipt", entityId: receipt.id };
  }

  async createSalesInvoiceForOrder(orderId: string) {
    const order = await prisma.franchiseOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (invoiceBlockedOrderTypes.includes(order.orderType)) throw new Error("İç transfer veya operasyonel transfer için satış faturası oluşturulamaz.");
    if (order.parasutInvoiceId) return { entityType: "FranchiseOrder", entityId: order.id, status: "EXISTING" };

    const customerMapping = order.branchId ? await prisma.externalCustomerMapping.findFirst({
      where: { branchId: order.branchId, provider: "PARASUT", isActive: true },
      select: { externalCustomerId: true },
    }) : null;
    if (!customerMapping) throw new Error(MANUAL_REVIEW_REASONS.CUSTOMER_MAPPING_REQUIRED);

    const response = await this.client.createSalesInvoice({
      orderId,
      orderNumber: order.orderNumber,
      contactExternalId: customerMapping.externalCustomerId,
      total: order.grandTotal,
      currency: order.currency,
      lines: order.items.map((item) => ({
        name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
      })),
    });

    await prisma.franchiseOrder.update({
      where: { id: orderId },
      data: {
        parasutInvoiceId: response.id,
        parasutInvoiceNumber: response.number,
        invoiceStatus: response.status ?? "CREATED",
        financialStatus: ORDER_FINANCIAL_STATUSES.INVOICE_CREATED,
        invoicedAt: new Date(),
        invoiceTotal: new Prisma.Decimal(response.total ?? order.grandTotal),
        invoiceCurrency: response.currency ?? order.currency,
        activities: { create: { type: "PARASUT_SALES_INVOICE_CREATED", description: `Paraşüt satış faturası oluşturuldu: ${response.number ?? response.id}` } },
      },
    });

    return { entityType: "FranchiseOrder", entityId: orderId, invoiceId: response.id };
  }
}

async function upsertExternalInvoice(invoice: ParasutInvoicePayload) {
  return prisma.externalInvoice.upsert({
    where: { provider_externalInvoiceId: { provider: "PARASUT", externalInvoiceId: invoice.id } },
    create: {
      provider: "PARASUT",
      invoiceType: invoice.invoiceType,
      externalInvoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      externalOrderId: invoice.externalOrderId ?? invoice.orderReference,
      customerName: invoice.invoiceType === "SALES" ? invoice.contactName : undefined,
      supplierName: invoice.invoiceType === "PURCHASE" ? invoice.contactName : undefined,
      invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : undefined,
      status: invoice.status ?? "RECEIVED",
      subtotal: invoice.subtotal == null ? undefined : new Prisma.Decimal(invoice.subtotal),
      vatTotal: invoice.vatTotal == null ? undefined : new Prisma.Decimal(invoice.vatTotal),
      total: new Prisma.Decimal(invoice.total),
      currency: invoice.currency ?? "TRY",
      payload: stringifyPayload(invoice),
    },
    update: {
      invoiceNumber: invoice.invoiceNumber,
      externalOrderId: invoice.externalOrderId ?? invoice.orderReference,
      status: invoice.status ?? "RECEIVED",
      total: new Prisma.Decimal(invoice.total),
      currency: invoice.currency ?? "TRY",
      payload: stringifyPayload(invoice),
    },
  });
}

async function matchOrderForInvoice(invoice: ParasutInvoicePayload) {
  const reference = invoice.externalOrderId ?? invoice.orderReference;
  if (!reference) return null;
  return prisma.franchiseOrder.findFirst({
    where: {
      OR: [
        { externalOrderId: reference },
        { ticimaxOrderNumber: reference },
        { orderNumber: reference },
      ],
    },
    select: { id: true, grandTotal: true, currency: true, branchId: true, orderType: true },
  });
}

async function createLedgerDebitForSalesInvoice(input: {
  branchId: string;
  invoiceId: string;
  orderId: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
}) {
  try {
    const ledger = new BranchLedgerService();
    await ledger.createEntry({
      branchId: input.branchId,
      currency: input.currency,
      entryType: "PRODUCT_SALE_DEBIT",
      direction: "DEBIT",
      amount: input.amount,
      referenceType: "ExternalInvoice",
      referenceId: input.invoiceId,
      orderId: input.orderId,
      invoiceId: input.invoiceId,
      sourceSystem: "PARASUT",
      externalReferenceId: input.invoiceNumber,
      description: `${input.invoiceNumber} numaralı Paraşüt satış faturası cariye yansıtıldı.`,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}

async function matchSupplier(invoice: ParasutInvoicePayload) {
  if (invoice.contactId) {
    const mapping = await prisma.externalSupplierMapping.findFirst({
      where: { provider: "PARASUT", externalSupplierId: invoice.contactId, isActive: true },
      select: { supplierId: true },
    });
    if (mapping?.supplierId) return mapping.supplierId;
  }

  const supplier = await prisma.supplier.findFirst({
    where: {
      archivedAt: null,
      OR: [
        invoice.taxNumber ? { taxNumber: invoice.taxNumber } : undefined,
        invoice.contactName ? { name: { contains: invoice.contactName } } : undefined,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    },
    select: { id: true },
  });
  return supplier?.id ?? null;
}

async function matchParasutProduct(externalProductId?: string, sku?: string, barcode?: string) {
  if (externalProductId) {
    const mapping = await prisma.externalProductMapping.findFirst({
      where: { sourceSystem: "PARASUT", externalProductId, isActive: true },
      select: { product: true },
    });
    if (mapping?.product) return mapping.product;
  }

  return prisma.product.findFirst({
    where: {
      archivedAt: null,
      isActive: true,
      OR: [
        externalProductId ? { parasutProductId: externalProductId } : undefined,
        sku ? { sku } : undefined,
        barcode ? { barcode } : undefined,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    },
  });
}

async function createReconciliation(input: {
  type: string;
  status: string;
  orderId?: string;
  goodsReceiptId?: string;
  externalInvoiceId?: string;
  internalAmount?: number;
  externalAmount?: number;
  currency?: string;
  details?: string;
}) {
  const internalAmount = input.internalAmount == null ? null : new Prisma.Decimal(input.internalAmount);
  const externalAmount = input.externalAmount == null ? null : new Prisma.Decimal(input.externalAmount);
  await prisma.reconciliationRecord.create({
    data: {
      reconciliationType: input.type,
      provider: "PARASUT",
      status: input.status,
      orderId: input.orderId,
      goodsReceiptId: input.goodsReceiptId,
      externalInvoiceId: input.externalInvoiceId,
      internalAmount,
      externalAmount,
      differenceAmount: internalAmount && externalAmount ? internalAmount.minus(externalAmount) : null,
      currency: input.currency,
      discrepancyDetails: input.details,
    },
  });
}
