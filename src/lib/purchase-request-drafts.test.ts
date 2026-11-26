import assert from "node:assert/strict";
import test from "node:test";
import { assertPurchaseRequestDraft, purchaseRequestDraftWarning } from "./purchase-request-drafts";

test("draft warning starts exactly after 24 hours, not at midnight", () => {
  const created = new Date("2026-11-26T20:00:00Z");
  assert.equal(purchaseRequestDraftWarning("DRAFT", created, new Date("2026-11-27T19:59:59Z")), null);
  assert.match(purchaseRequestDraftWarning("DRAFT", created, new Date("2026-11-27T20:00:00Z"))!, /1 gün/);
  assert.match(purchaseRequestDraftWarning("DRAFT", created, new Date("2026-11-29T20:00:00Z"))!, /3 gün/);
});

test("submitted and closed requests never have draft warnings", () => {
  for (const status of ["SUBMITTED", "APPROVED", "CONVERTED", "REJECTED", "CANCELLED"]) {
    assert.equal(purchaseRequestDraftWarning(status, new Date("2026-01-01"), new Date("2026-11-26")), null);
    assert.throws(() => assertPurchaseRequestDraft(status, false));
  }
  assert.doesNotThrow(() => assertPurchaseRequestDraft("DRAFT", false));
  assert.throws(() => assertPurchaseRequestDraft("DRAFT", true));
});

test("future drafts do not warn and year boundaries use elapsed days", () => {
  assert.equal(purchaseRequestDraftWarning("DRAFT", new Date("2027-01-02"), new Date("2027-01-01")), null);
  assert.match(purchaseRequestDraftWarning("DRAFT", new Date("2026-12-31"), new Date("2027-01-02"))!, /2 gün/);
});
