export function salesUnitFactor(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : 1;
}

export function toBaseQuantity(quantity: number, factor: number): number {
  return Number((quantity * salesUnitFactor(factor)).toFixed(9));
}

export function changeOrderQuantity(quantity: number, increment: number): number {
  return Math.max(0, Number((quantity + increment).toFixed(9)));
}
