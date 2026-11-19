export function assertOrderLineStock(input: {
  quantity: number; availableQuantity: number; manualShortShipment: boolean; productName: string;
}) {
  if (!input.manualShortShipment && input.availableQuantity < input.quantity) {
    throw new Error(`${input.productName} için yeterli kullanılabilir stok yok. Tedarik bekleyen ürün için Eksik Sevk seçeneğini işaretleyin.`);
  }
}
