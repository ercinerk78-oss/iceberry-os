export function calculateOrderTaxTotals(lines: { lineSubtotal: number; vatRate: number }[]) {
  for (const line of lines) {
    if (!Number.isFinite(line.lineSubtotal) || line.lineSubtotal < 0 || !Number.isFinite(line.vatRate) || line.vatRate < 0 || line.vatRate > 100) throw new Error("Sipariş tutarı veya KDV oranı geçersiz.");
  }
  const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  const vatTotal = lines.reduce((sum, line) => sum + line.lineSubtotal * line.vatRate / 100, 0);
  return { subtotal, vatTotal, grandTotal: subtotal + vatTotal };
}
