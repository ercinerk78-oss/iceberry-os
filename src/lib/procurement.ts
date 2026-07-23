import { Prisma } from "@prisma/client";

export const PURCHASE_ORDER_STATUSES = [
  ["DRAFT", "Taslak"],
  ["APPROVED", "Onaylandı"],
  ["SENT", "Tedarikçiye Gönderildi"],
  ["PARTIALLY_RECEIVED", "Kısmi Teslimat"],
  ["RECEIVED", "Teslim Alındı"],
  ["CLOSED", "Kapandı"],
  ["CANCELLED", "İptal Edildi"],
] as const;

export const PURCHASE_REQUEST_STATUSES = [
  ["DRAFT", "Taslak"],
  ["SUBMITTED", "Onay Bekliyor"],
  ["APPROVED", "Onaylandı"],
  ["CONVERTED", "Siparişe Dönüştü"],
  ["REJECTED", "Reddedildi"],
  ["CANCELLED", "İptal Edildi"],
] as const;

export const PURCHASE_PAYMENT_STATUSES = [
  ["UNPAID", "Ödenmedi"],
  ["PARTIALLY_PAID", "Kısmi Ödendi"],
  ["PAID", "Ödendi"],
  ["ON_HOLD", "Beklemede"],
] as const;

export const PURCHASE_PRIORITIES = [
  ["LOW", "Düşük"],
  ["NORMAL", "Normal"],
  ["HIGH", "Yüksek"],
  ["URGENT", "Acil"],
] as const;

export function procurementLabel(options: readonly (readonly [string, string])[], value: string) {
  return options.find(([key]) => key === value)?.[1] ?? value;
}

export function purchaseOrderNumber() {
  return `PO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export function purchaseRequestNumber() {
  return `PR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export function procurementMoney(value: number | string | Prisma.Decimal | null | undefined, currency = "TRY") {
  const amount = value instanceof Prisma.Decimal ? value.toNumber() : Number(value ?? 0);
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
}

export function procurementDate(value: Date | string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(value))
    : "-";
}

export function calculatePurchaseLine(input: {
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountRate?: number;
}) {
  const lineSubtotal = roundMoney(input.quantity * input.unitPrice);
  const lineDiscount = roundMoney(lineSubtotal * ((input.discountRate ?? 0) / 100));
  const taxableAmount = lineSubtotal - lineDiscount;
  const lineVat = roundMoney(taxableAmount * (input.vatRate / 100));
  const lineTotal = roundMoney(taxableAmount + lineVat);

  return { lineSubtotal, lineDiscount, lineVat, lineTotal };
}

export function calculatePurchaseTotals(lines: { lineSubtotal: number; lineDiscount: number; lineVat: number; lineTotal: number }[]) {
  return {
    subtotal: roundMoney(lines.reduce((sum, line) => sum + line.lineSubtotal, 0)),
    discountTotal: roundMoney(lines.reduce((sum, line) => sum + line.lineDiscount, 0)),
    vatTotal: roundMoney(lines.reduce((sum, line) => sum + line.lineVat, 0)),
    grandTotal: roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0)),
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
