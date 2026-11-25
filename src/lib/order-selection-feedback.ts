import { salesUnitFactor } from "./order-quantity";

export function orderSelectionQuantity(quantity: number, factor: number, unit: string) {
  const format = (value: number) => value.toLocaleString("tr-TR", { maximumFractionDigits: 9 });
  const size = salesUnitFactor(factor);
  return size === 1
    ? `${format(quantity)} ${unit}`
    : `${format(Number((quantity / size).toFixed(9)))} koli / paket · ${format(quantity)} ${unit}`;
}
