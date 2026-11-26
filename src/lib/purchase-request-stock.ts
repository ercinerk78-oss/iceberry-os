export function purchaseRequestStock(product: { unit: string; stocks: { warehouseId: string; quantity: number }[] } | undefined, warehouseId: string) {
  if (!product || !warehouseId) return "";
  const quantity = product.stocks.filter(stock => stock.warehouseId === warehouseId).reduce((total, stock) => total + stock.quantity, 0);
  return `${quantity.toLocaleString("tr-TR", { maximumFractionDigits: 9 })} ${product.unit}`;
}
