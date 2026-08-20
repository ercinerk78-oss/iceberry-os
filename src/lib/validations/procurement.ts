import { z } from "zod";

export const purchaseOrderLineSchema = z.object({
  productId: z.string().min(1, "Ürün seçmelisiniz."),
  quantity: z.coerce.number().positive("Miktar sıfırdan büyük olmalıdır."),
  unitPrice: z.coerce.number().min(0, "Birim fiyat negatif olamaz."),
  vatRate: z.coerce.number().min(0).max(100).default(20),
  discountRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().max(500, "Kalem notu en fazla 500 karakter olabilir.").optional(),
});

export const purchaseOrderSchema = z.object({
  sourceRequestId: z.string().optional(),
  supplierId: z.string().min(1, "Tedarikçi seçmelisiniz."),
  warehouseId: z.string().min(1, "Depo seçmelisiniz."),
  expectedDeliveryDate: z.string().optional(),
  currency: z.string().min(3).max(3).default("TRY"),
  paymentTermDays: z.coerce.number().int().min(0).max(365).optional(),
  externalReference: z.string().max(120).optional(),
  notes: z.string().max(1000, "Not en fazla 1000 karakter olabilir.").optional(),
  items: z.array(purchaseOrderLineSchema).min(1, "En az bir ürün eklemelisiniz."),
});

export const purchaseRequestLineSchema = z.object({
  productId: z.string().min(1, "Ürün seçmelisiniz."),
  quantity: z.coerce.number().positive("Miktar sıfırdan büyük olmalıdır."),
  estimatedUnitCost: z.coerce.number().min(0, "Tahmini birim maliyet negatif olamaz.").optional(),
  notes: z.string().max(500, "Kalem notu en fazla 500 karakter olabilir.").optional(),
});

export const purchaseRequestSchema = z.object({
  title: z.string().min(3, "Talep başlığı en az 3 karakter olmalıdır.").max(160),
  warehouseId: z.string().min(1, "Depo seçmelisiniz."),
  supplierId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  neededByDate: z.string().optional(),
  notes: z.string().max(1000, "Not en fazla 1000 karakter olabilir.").optional(),
  items: z.array(purchaseRequestLineSchema).min(1, "En az bir ürün eklemelisiniz."),
});

export const goodsReceiptLineSchema = z.object({
  productId: z.string().min(1, "Ürün seçmelisiniz."),
  expectedQuantity: z.coerce.number().min(0).default(0),
  receivedQuantity: z.coerce.number().min(0).default(0),
  acceptedQuantity: z.coerce.number().min(0).default(0),
  damagedQuantity: z.coerce.number().min(0).default(0),
  lotNumber: z.string().max(120).optional(),
  expirationDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const goodsReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1, "Satın alma siparişi seçmelisiniz."),
  invoiceNumber: z.string().max(120).optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(goodsReceiptLineSchema).min(1, "En az bir ürün kabul etmelisiniz."),
});

export const supplierProductSchema = z.object({
  supplierId: z.string().min(1, "Tedarikçi seçmelisiniz."),
  productId: z.string().min(1, "Ürün seçmelisiniz."),
  supplierSku: z.string().max(120).optional(),
  supplierProductName: z.string().max(200).optional(),
  currency: z.string().min(3).max(3).default("TRY"),
  unitPrice: z.coerce.number().min(0).optional(),
  minimumOrderQuantity: z.coerce.number().positive().default(1),
  orderIncrement: z.coerce.number().positive().default(1),
  leadTimeDays: z.coerce.number().int().min(0).max(365).optional(),
  paymentTermDays: z.coerce.number().int().min(0).max(365).optional(),
  isPreferred: z.coerce.boolean().default(false),
  notes: z.string().max(1000).optional(),
});
