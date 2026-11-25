import { z } from "zod";

export const countItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().finite().min(0).max(1_000_000_000),
});

export function assertCountEditable(status: string) {
  if (status !== "DRAFT") throw new Error("Onaylanan sayım değiştirilemez.");
}

export type CountProduct = { id: string; name: string; sku: string; unit: string };
export type CountedProduct = { productId: string; name: string; sku: string; unit: string; quantity: number | null; expected: number };

export function stockCountProducts(products: CountProduct[], items: CountedProduct[], locked: boolean) {
  const all = new Map<string, CountProduct>(locked ? [] : products.map(product => [product.id, product]));
  for (const item of items) if (!all.has(item.productId)) all.set(item.productId, { id: item.productId, name: item.name, sku: item.sku, unit: item.unit });
  return [...all.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
}
