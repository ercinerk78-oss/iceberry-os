export const ORDER_STATUSES = [
  ["SUBMITTED", "İnceleme Bekliyor"],
  ["APPROVED", "Onaylandı"],
  ["STOCK_RESERVED", "Stok Rezerve"],
  ["WAREHOUSE_QUEUE", "Depo Sırasında"],
  ["PREPARING", "Hazırlanıyor"],
  ["READY", "Sevkiyata Hazır"],
  ["PARTIAL_SHIPMENT", "Kısmi Sevk"],
  ["BACKORDER_PENDING", "Eksik Ürün Bekliyor"],
  ["SHIPPED", "Sevk Edildi"],
  ["DELIVERED", "Teslim Edildi"],
  ["REJECTED", "Reddedildi"],
  ["CANCELLED", "İptal Edildi"],
] as const;

export const INVOICE_STATUSES = [
  ["NOT_CREATED", "Oluşturulmadı"],
  ["CREATED", "Oluşturuldu"],
  ["CANCELLED", "İptal"],
] as const;

export const MOVEMENT_TYPES = [
  ["IN", "Stok Girişi"],
  ["OUT", "Stok Çıkışı"],
  ["RESERVE", "Rezervasyon"],
  ["RELEASE", "Rezervasyon İadesi"],
  ["ADJUSTMENT", "Sayım Düzeltmesi"],
] as const;

export function warehouseLabel(options: readonly (readonly [string, string])[], value: string) {
  return options.find(([key]) => key === value)?.[1] ?? value;
}

export function money(value: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value);
}

export function dateTime(value: Date | string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "-";
}

export function orderNumber() {
  return `IB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
