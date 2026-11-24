import { z } from "zod";

export const countItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().finite().min(0).max(1_000_000_000),
});

export function assertCountEditable(status: string) {
  if (status !== "DRAFT") throw new Error("Onaylanan sayım değiştirilemez.");
}
