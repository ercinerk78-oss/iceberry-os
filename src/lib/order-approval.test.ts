import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { executeOrderApproval, ORDER_APPROVAL_TRANSACTION_OPTIONS } from "./order-approval";

function fixture(status = "SUBMITTED", available = 100, sourceSyncStatus = "SYNCED") {
  const order = { id: "o", orderNumber: "IB-TEST", warehouseId: "w", status, sourceSyncStatus,
    items: [{ id: "ib", productId: "b", quantity: 10 }, { id: "ia", productId: "a", quantity: 5 }] };
  const stocks = new Map(["a", "b"].map(id => [id, { id, quantity: 100, reservedQuantity: 100 - available, availableQuantity: available }]));
  const reserved: string[] = [];
  const movements: unknown[] = [];
  const items: unknown[] = [];
  let lockCount = 0;
  const tx = {
    $queryRaw: async () => { lockCount++; return []; },
    franchiseOrder: { findUnique: async () => order, update: async ({ data }: { data: { status: string } }) => { order.status = data.status; return order; } },
    franchiseOrderItem: { update: async (input: unknown) => { items.push(input); } },
    warehouseStock: {
      findUnique: async ({ where }: { where: { warehouseId_productId: { productId: string } } }) => stocks.get(where.warehouseId_productId.productId),
      update: async ({ where, data }: { where: { id: string }; data: { reservedQuantity: { increment: number }; availableQuantity: { decrement: number } } }) => {
        const stock = stocks.get(where.id)!;
        reserved.push(where.id);
        stock.reservedQuantity += data.reservedQuantity.increment;
        stock.availableQuantity -= data.availableQuantity.decrement;
        return stock;
      },
    },
    stockMovement: { create: async (input: unknown) => { movements.push(input); } },
  } as unknown as Prisma.TransactionClient;
  return { tx, order, stocks, reserved, movements, items, locks: () => lockCount };
}

test("approval has an explicit budget above Prisma's five second default", () => {
  assert.deepEqual(ORDER_APPROVAL_TRANSACTION_OPTIONS, { maxWait: 10_000, timeout: 60_000 });
});

test("approval reserves once, locks consistently, and never changes physical stock", async () => {
  const f = fixture();
  await executeOrderApproval(f.tx, "o");
  assert.equal(f.order.status, "STOCK_RESERVED");
  assert.deepEqual(f.reserved, ["a", "b"]);
  assert.equal(f.stocks.get("a")!.quantity, 100);
  assert.equal(f.stocks.get("b")!.quantity, 100);
  assert.equal(f.stocks.get("a")!.reservedQuantity, 5);
  assert.equal(f.stocks.get("b")!.availableQuantity, 90);
  assert.equal(f.movements.length, 2);
  assert.equal(f.items.length, 2);
  assert.equal(f.locks(), 3);
  await executeOrderApproval(f.tx, "o");
  assert.equal(f.movements.length, 2);
  assert.equal(f.stocks.get("a")!.reservedQuantity, 5);
});

test("shortage retains existing stock rules and does not mark the order approved", async () => {
  const f = fixture("SUBMITTED", 0);
  await assert.rejects(() => executeOrderApproval(f.tx, "o"), /Yeterli kullanılabilir stok yok/);
  assert.equal(f.order.status, "SUBMITTED");
  assert.equal(f.movements.length, 0);
  assert.equal(f.items.length, 0);
});

test("closed, draft and integration-review orders cannot be approved", async () => {
  for (const status of ["DRAFT", "DRAFT_CANCELLED", "CANCELLED", "REJECTED"]) {
    const f = fixture(status);
    await assert.rejects(() => executeOrderApproval(f.tx, "o"));
    assert.equal(f.movements.length, 0);
  }
  const review = fixture("SUBMITTED", 100, "MANUAL_REVIEW");
  await assert.rejects(() => executeOrderApproval(review.tx, "o"), /incelenmeden/);
  assert.equal(review.movements.length, 0);
});
