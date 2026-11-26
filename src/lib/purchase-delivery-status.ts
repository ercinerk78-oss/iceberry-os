type DeliveryItem = { orderedQuantity: number; receivedQuantity: number };

export function completedDeliveryLabel(status: string, items: DeliveryItem[]) {
  if (!["CLOSED", "RECEIVED"].includes(status) || !items.some(item => item.receivedQuantity > 0)) return null;
  return items.some(item => Math.abs(item.orderedQuantity - item.receivedQuantity) > 0.000001)
    ? "Eksik/Fazla Teslimle Tamamlandı"
    : "Tamamlandı";
}
