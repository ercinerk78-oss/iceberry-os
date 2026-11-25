import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { executeStockCountTransaction } from "./stock-count-service";

function data(command: string, values: Record<string, string> = {}) {
  const form = new FormData(); form.set("command", command); form.set("id", "c");
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}
test("create, save, edit, approve and locked edits never mutate warehouse stock", async () => {
  let status = "DRAFT";
  const items = new Map<string, { expectedQuantity: number; countedQuantity: number; differenceQuantity: number }>();
  const tx = {
    $queryRaw: async () => [],
    warehouse: { findUnique: async () => ({ id: "w" }) },
    stockCount: { create: async () => ({ id: "c" }), findUnique: async () => ({ id: "c", status, warehouseId: "w" }), update: async ({ data: update }: { data: { status: string } }) => { status = update.status; } },
    product: { findUnique: async () => ({ id: "p" }) },
    warehouseStock: { findUnique: async () => ({ quantity: 100 }) },
    stockCountItem: {
      findUnique: async ({ where }: { where: { stockCountId_productId: { productId: string } } }) => items.get(where.stockCountId_productId.productId) ?? null,
      count: async ({ where }: { where: { countedQuantity?: null } }) => where.countedQuantity === null ? 0 : items.size,
      upsert: async ({ where, create, update }: { where: { stockCountId_productId: { productId: string } }; create: { expectedQuantity: number; countedQuantity: number; differenceQuantity: number }; update: { countedQuantity: number; differenceQuantity: number } }) => { const id = where.stockCountId_productId.productId; items.set(id, items.has(id) ? { ...items.get(id)!, ...update } : create); },
      deleteMany: async ({ where }: { where: { productId: string } }) => { items.delete(where.productId); },
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal(await executeStockCountTransaction(tx, data("create", { date: "2026-11-25", warehouseId: "w" }), "u"), "c");
  await assert.rejects(() => executeStockCountTransaction(tx, data("approve"), "u"), /Önce/);
  await assert.rejects(() => executeStockCountTransaction(tx, data("item", { productId: "p", quantity: "" }), "u"), /Miktar/);
  await executeStockCountTransaction(tx, data("item", { productId: "p", quantity: "0" }), "u");
  await executeStockCountTransaction(tx, data("item", { productId: "p", quantity: "12.5" }), "u");
  assert.equal(items.size, 1); assert.equal(items.get("p")!.countedQuantity, 12.5); assert.equal(items.get("p")!.expectedQuantity, 100);
  await executeStockCountTransaction(tx, data("item", { productId: "b", quantity: "7" }), "u");
  assert.equal(items.get("p")!.countedQuantity, 12.5);
  await executeStockCountTransaction(tx, data("remove", { productId: "b" }), "u");
  await executeStockCountTransaction(tx, data("approve"), "u");
  assert.equal(status, "APPROVED");
  await assert.rejects(() => executeStockCountTransaction(tx, data("item", { productId: "p", quantity: "99" }), "u"), /değiştirilemez/);
  await assert.rejects(() => executeStockCountTransaction(tx, data("remove", { productId: "p" }), "u"), /değiştirilemez/);
  // There are no stock mutation or movement APIs in the fixture: any use would fail.
});
