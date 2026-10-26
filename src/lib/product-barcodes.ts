export function nextPickedQuantity(input: {
  currentPickedQuantity: number;
  orderedQuantity: number;
  scannedConversionFactor: number;
}) {
  if (input.scannedConversionFactor <= 0) throw new Error("Barkod dönüşüm miktarı geçersiz.");
  const nextQuantity = input.currentPickedQuantity + input.scannedConversionFactor;
  if (nextQuantity > input.orderedQuantity) throw new Error("Sipariş miktarı aşılamaz.");
  return nextQuantity;
}
