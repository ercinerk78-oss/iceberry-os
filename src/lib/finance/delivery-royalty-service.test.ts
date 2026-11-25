import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { saveDeliveryRoyaltyTransaction } from "./delivery-royalty-service";

const timestamp = "2026-11-24T10:00:00.000Z";
const input = { revenueId: "r", revenueUpdatedAt: timestamp, branchUpdatedAt: timestamp, period: "2026-10", deliveryRevenue: "126000", rate: 3, startMonth: "", exemptionNote: "" };
function fixture() {
  const branch = { id: "b", archivedAt: null, ownershipType: "FRANCHISE", updatedAt: new Date(timestamp) };
  const revenue = { id: "r", branchId: "b", branch, year: 2026, month: 10, periodType: "MONTHLY", status: "APPROVED", currency: "TRY", grossRevenue: 425030, updatedAt: new Date(timestamp) };
  const writes: unknown[] = [];
  const tx = { $queryRaw: async () => [], branchRevenueRecord: { findUnique: async () => revenue, update: async (data: unknown) => { writes.push(data); return revenue; } }, branch: { update: async (data: unknown) => { writes.push(data); return branch; } } };
  return { tx: tx as unknown as Prisma.TransactionClient, writes, revenue, branch };
}
test("worksheet saves source data and settings only, without any ledger or invoice writes", async () => {
  const f = fixture();
  const result = await saveDeliveryRoyaltyTransaction(f.tx, input, "u", ["b"]);
  assert.equal(result.result.totalRoyalty, "13486.68"); assert.equal(f.writes.length, 2);
  assert.match(JSON.stringify(f.writes), /royaltyCalculationInputs/);
  assert.doesNotMatch(JSON.stringify(f.writes), /royaltyAccrual|ledger|invoice/i);
});
test("branch scope, stale versions, wrong month and currency block all writes", async () => {
  const f = fixture();
  await assert.rejects(() => saveDeliveryRoyaltyTransaction(f.tx, input, "u", []), /yetkiniz/);
  await assert.rejects(() => saveDeliveryRoyaltyTransaction(f.tx, { ...input, revenueUpdatedAt: "2026-11-23T10:00:00.000Z" }, "u", null), /değişmiş/);
  await assert.rejects(() => saveDeliveryRoyaltyTransaction(f.tx, { ...input, period: "2026-11" }, "u", null), /aylık ciro/);
  f.revenue.currency = "EUR";
  await assert.rejects(() => saveDeliveryRoyaltyTransaction(f.tx, input, "u", null), /TL/);
  assert.equal(f.writes.length, 0);
});
test("rejected revenue, company branches and invalid delivery are rejected", async () => {
  const f = fixture(); f.revenue.status = "REJECTED";
  await assert.rejects(() => saveDeliveryRoyaltyTransaction(f.tx, input, "u", null), /aylık ciro/);
  f.revenue.status = "APPROVED"; f.branch.ownershipType = "COMPANY_OWNED";
  await assert.rejects(() => saveDeliveryRoyaltyTransaction(f.tx, input, "u", null), /franchise/);
  f.branch.ownershipType = "FRANCHISE";
  await assert.rejects(() => saveDeliveryRoyaltyTransaction(f.tx, { ...input, deliveryRevenue: "500000" }, "u", null), /aşamaz/);
  assert.equal(f.writes.length, 0);
});

test("manual total and break-even persist without changing the official revenue", async () => {
  const f = fixture();
  const result = await saveDeliveryRoyaltyTransaction(f.tx, { ...input, totalRevenue: "500000", totalRevenueSource: "MANUAL", deliveryRevenue: "100000", hasDelivery: true, hasBreakEven: true, breakEven: "50000" }, "u", null);
  assert.equal(result.result.totalRoyalty, "14760.00");
  assert.equal(f.revenue.grossRevenue, 425030);
  const writes = JSON.stringify(f.writes);
  assert.match(writes, /"totalRevenue":"500000"/);
  assert.match(writes, /"sourceTotalRevenue":"425030.00"/);
  assert.match(writes, /"breakEven":"50000"/);
  assert.doesNotMatch(writes, /"grossRevenue"/);
});

test("a no-delivery no-break-even choice is stored with explicit zeros", async () => {
  const f = fixture();
  const result = await saveDeliveryRoyaltyTransaction(f.tx, { ...input, hasDelivery: false, deliveryRevenue: "0", hasBreakEven: false, breakEven: "0", rate: 2 }, "u", null);
  assert.equal(result.result.totalRoyalty, "10200.72");
  assert.match(JSON.stringify(f.writes), /"hasDelivery":false/);
});
