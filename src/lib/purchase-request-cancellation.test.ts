import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { canCancelPurchaseRequest, cancelPurchaseRequestInTx } from "./purchase-request-cancellation";

test("only unordered draft and submitted requests can be removed", () => {
  for (const status of ["DRAFT", "SUBMITTED"]) {
    assert.equal(canCancelPurchaseRequest(status, false), true);
    assert.equal(canCancelPurchaseRequest(status, true), false);
  }
  for (const status of ["APPROVED", "CONVERTED", "CANCELLED", "REJECTED", "UNKNOWN"]) assert.equal(canCancelPurchaseRequest(status, false), false);
});

test("cancellation locks the request, preserves items, and records the acting user without stock writes", async () => {
  for (const initialStatus of ["DRAFT", "SUBMITTED"]) {
    let status = initialStatus;
    const calls: string[] = [];
    const items = [{ id: "line", quantity: 50 }];
    const tx = {
      $queryRaw: async () => { calls.push("lock"); return []; },
      purchaseRequest: {
        findUnique: async () => { calls.push("read"); return { id: "request", status, purchaseOrder: null, items }; },
        update: async ({ where, data }: { where: { id: string }; data: { status: string; approvals: { create: { action: string; status: string; actedById: string } } } }) => {
          calls.push("write");
          assert.equal(where.id, "request");
          assert.deepEqual(Object.keys(data).sort(), ["approvals", "status"]);
          assert.equal(data.approvals.create.actedById, "user");
          assert.equal(data.approvals.create.action, "CANCELLED");
          assert.equal(data.approvals.create.status, "CANCELLED");
          status = data.status;
          return { id: "request", status };
        },
      },
    } as unknown as Prisma.TransactionClient;
    await cancelPurchaseRequestInTx(tx, "request", "user");
    assert.deepEqual(calls, ["lock", "read", "write"]);
    assert.equal(status, "CANCELLED");
    assert.deepEqual(items, [{ id: "line", quantity: 50 }]);
    await assert.rejects(() => cancelPurchaseRequestInTx(tx, "request", "user"), /kaldırılabilir/);
    assert.equal(calls.filter(call => call === "write").length, 1);
  }
});

test("converted, approved, missing and closed requests cannot be changed", async () => {
  for (const request of [null, { status: "DRAFT", purchaseOrder: { id: "po" } }, { status: "SUBMITTED", purchaseOrder: { id: "po" } }, { status: "APPROVED", purchaseOrder: null }, { status: "CANCELLED", purchaseOrder: null }]) {
    const tx = { $queryRaw: async () => [], purchaseRequest: { findUnique: async () => request } } as unknown as Prisma.TransactionClient;
    await assert.rejects(() => cancelPurchaseRequestInTx(tx, "request", "user"));
  }
});
