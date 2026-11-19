export function assertPurchaseOrderEditable(status: string, hasInvoice: boolean) {
  if (["CANCELLED", "CLOSED", "RECEIVED"].includes(status)) throw new Error("Kapalı veya teslim alınmış sipariş düzenlenemez.");
  if (hasInvoice) throw new Error("Faturası bağlı siparişin ürünleri değiştirilemez. Önce fatura mutabakatını tamamlayın.");
}

export function assertPurchaseQuantity(quantity: number, received: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Miktar sıfırdan büyük olmalıdır.");
  if (quantity < received) throw new Error("Sipariş miktarı teslim alınan miktardan düşük olamaz.");
}
