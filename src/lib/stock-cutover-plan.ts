import type { ProductImportRow } from "./product-import";
import { toBaseQuantity } from "./order-quantity";

export const CUTOVER_ID = "stock-count-20261120-orders-20261123-v1";
export const CUTOVER_ORDERS = ["IB-20261123-C6216C", "IB-20261123-6BA170"] as const;
export type CountImportRow = ProductImportRow & { countedQuantity: number };

export function cutoverLine(row: CountImportRow, quantity: number, orderNumber: string) {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Sipariş miktarı geçersiz.");
  const ordered = toBaseQuantity(quantity, row.factor);
  const missing = orderNumber === CUTOVER_ORDERS[0] && row.currentSku === "4422";
  const shipped = missing ? 0 : ordered;
  const subtotal = ordered * Number(row.salePrice);
  return { ordered, shipped, missing: ordered - shipped, subtotal };
}

export function remainingCount(counted: number, shipped: number, reserved: number) {
  if (![counted, shipped, reserved].every(n => Number.isFinite(n) && n >= 0)) throw new Error("Sayım miktarları geçersiz.");
  const result = Number((counted - shipped).toFixed(9));
  if (result < reserved) throw new Error("Sayım stoğu sevkiyat ve mevcut rezervasyonları karşılamıyor.");
  return result;
}
