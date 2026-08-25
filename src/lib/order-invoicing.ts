export type SalesInvoiceSourceItem = {
  productName: string;
  sku: string;
  unit: string;
  unitPrice: number;
  vatRate: number;
  packedQuantity: number;
  shippedQuantity: number;
};

export function shipmentBasedInvoiceSummary(items: SalesInvoiceSourceItem[]) {
  const lines = items
    .map((item) => {
      const quantity = item.shippedQuantity > 0 ? item.shippedQuantity : item.packedQuantity;
      const subtotal = item.unitPrice * quantity;
      const vatTotal = (subtotal * item.vatRate) / 100;
      return {
        item,
        quantity,
        subtotal,
        vatTotal,
        total: subtotal + vatTotal,
      };
    })
    .filter((line) => line.quantity > 0);

  return {
    lines,
    subtotal: lines.reduce((sum, line) => sum + line.subtotal, 0),
    vatTotal: lines.reduce((sum, line) => sum + line.vatTotal, 0),
    grandTotal: lines.reduce((sum, line) => sum + line.total, 0),
  };
}
