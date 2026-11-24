import { z } from "zod";
import { calculateOrderTaxTotals } from "./order-tax-totals";

export const draftValuesSchema = z.object({
  cart: z.record(z.string(), z.number().finite().min(0).max(1e9)),
  shortages: z.record(z.string(), z.boolean()),
  baseMode: z.record(z.string(), z.boolean()),
  franchiseeId: z.string(), branchId: z.string(), requestedDeliveryDate: z.string(),
  invoicePreference: z.enum(["CREATE_PARASUT_INVOICE", "CREATE_LATER", "NOT_REQUIRED"]),
  notes: z.string().max(1000),
});
export type DraftValues = z.infer<typeof draftValuesSchema>;
export const emptyDraftValues = (): DraftValues => ({ cart: {}, shortages: {}, baseMode: {}, franchiseeId: "", branchId: "", requestedDeliveryDate: "", invoicePreference: "CREATE_LATER", notes: "" });
export const draftRequestSchema = z.object({
  id: z.uuid(), version: z.number().int().min(0), command: z.enum(["save", "submit", "cancel"]),
  warehouseId: z.string().min(1),
  franchiseeId: z.string().optional(), branchId: z.string().optional(),
  requestedDeliveryDate: z.string().optional(),
  invoicePreference: z.enum(["CREATE_PARASUT_INVOICE", "CREATE_LATER", "NOT_REQUIRED"]),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().finite().positive().max(1e9), manualShortShipment: z.boolean() })).max(200),
}).refine(data => new Set(data.items.map(item => item.productId)).size === data.items.length, "Aynı ürün tek satırda bulunmalıdır.");
export type DraftRequest = z.infer<typeof draftRequestSchema>;
export type DraftRecord = { id: string; version: number; orderNumber: string; status: string; updatedAt: string };

export function draftRequest(values: DraftValues, id: string, version: number, warehouseId: string, command: DraftRequest["command"]): DraftRequest {
  return { id, version, warehouseId, command, franchiseeId: values.franchiseeId || undefined, branchId: values.branchId || undefined,
    requestedDeliveryDate: values.requestedDeliveryDate || undefined, invoicePreference: values.invoicePreference, notes: values.notes || undefined,
    items: Object.entries(values.cart).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId, quantity, manualShortShipment: values.shortages[productId] ?? false })) };
}
export function assertDraftEditable(status: string, actualVersion: number, expectedVersion: number) {
  if (status !== "DRAFT") throw new Error("Bu sipariş artık taslak değil; değişiklik yapılamaz.");
  if (actualVersion !== expectedVersion) throw new Error("Taslak başka bir kullanıcı tarafından güncellendi. Değişiklikleriniz bu cihazda korunuyor; güncel taslağı yeniden açın.");
}
export function draftDeliveryDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Geçerli bir teslim tarihi girin.");
  return date;
}
export function priceDraftLine(product: { id: string; name: string; sku: string; unit: string; salePrice: number; vatRate: number }, item: DraftRequest["items"][number]) {
  const { subtotal, vatTotal, grandTotal } = calculateOrderTaxTotals([{ lineSubtotal: product.salePrice * item.quantity, vatRate: product.vatRate }]);
  return { productId: product.id, productName: product.name, sku: product.sku, unit: product.unit, quantity: item.quantity,
    approvedQuantity: null, unitPrice: product.salePrice, vatRate: product.vatRate, lineSubtotal: subtotal, lineVat: vatTotal, lineTotal: grandTotal, manualShortShipment: item.manualShortShipment };
}
