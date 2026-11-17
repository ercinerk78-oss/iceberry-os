export function nextAverageCost(onHand: number, average: number | null, received: number, unitCost: number | null) {
  if (unitCost === null || (onHand > 0 && average === null)) return null;
  return (onHand * (average ?? 0) + received * unitCost) / (onHand + received);
}

export function profitability(netSales: number, cost: number, incompleteSales: number) {
  if (incompleteSales > 0) return { grossProfit: null, margin: null };
  const grossProfit = netSales - cost;
  return { grossProfit, margin: netSales > 0 ? grossProfit / netSales * 100 : null };
}
