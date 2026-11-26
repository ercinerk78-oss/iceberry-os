import assert from "node:assert/strict";
import test from "node:test";
import { recentPurchaseRequestWhere } from "./recent-purchase-requests";

test("duplicate warning covers exactly the last 72 hours across warehouses and suppliers", () => {
  const now = new Date("2026-11-26T10:00:00Z");
  const where = recentPurchaseRequestWhere(["p1", "p2", "p1"], now);
  assert.deepEqual(where.productId.in, ["p1", "p2"]);
  assert.equal(where.purchaseRequest.createdAt.gte.toISOString(), "2026-11-23T10:00:00.000Z");
  assert.equal(where.purchaseRequest.createdAt.lte, now);
  assert.deepEqual(where.purchaseRequest.status.notIn, ["CANCELLED", "REJECTED"]);
  assert.equal("warehouseId" in where.purchaseRequest, false);
  assert.equal("supplierId" in where.purchaseRequest, false);
});

test("72-hour warning remains stable at month and year boundaries", () => {
  const where = recentPurchaseRequestWhere(["p"], new Date("2027-01-01T00:00:00Z"));
  assert.equal(where.purchaseRequest.createdAt.gte.toISOString(), "2026-12-29T00:00:00.000Z");
});
