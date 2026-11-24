import assert from "node:assert/strict";
import test from "node:test";
import { assertDraftEditable, draftDeliveryDate, draftRequest, draftRequestSchema, emptyDraftValues, priceDraftLine } from "./order-draft";
import { normalizeBranchSearch } from "./branch-search";

test("drafts allow incomplete orders but preserve quantities, shortage flags and preferences", () => {
  const values = emptyDraftValues();
  const id = "d9cd2845-09dd-48bc-baf0-155f6c0b1d14";
  assert.equal(draftRequestSchema.parse(draftRequest(values, id, 0, "warehouse", "save")).items.length, 0);
  values.cart = { bubble: 20, tea: 0.5, unused: 0 }; values.shortages = { bubble: true }; values.invoicePreference = "NOT_REQUIRED";
  const parsed = draftRequestSchema.parse(draftRequest(values, id, 2, "warehouse", "save"));
  assert.deepEqual(parsed.items, [{ productId: "bubble", quantity: 20, manualShortShipment: true }, { productId: "tea", quantity: 0.5, manualShortShipment: false }]);
  assert.equal(parsed.invoicePreference, "NOT_REQUIRED");
  assert.equal(parsed.version, 2);
});
test("stale or submitted drafts cannot be edited", () => {
  assert.doesNotThrow(() => assertDraftEditable("DRAFT", 3, 3));
  assert.throws(() => assertDraftEditable("DRAFT", 4, 3), /başka bir kullanıcı/);
  for (const status of ["SUBMITTED", "STOCK_RESERVED", "SHIPPED", "CANCELLED", "DRAFT_CANCELLED"]) assert.throws(() => assertDraftEditable(status, 3, 3), /artık taslak değil/);
});
test("draft delivery dates reject invalid calendar dates", () => {
  assert.equal(draftDeliveryDate("2026-11-24")?.toISOString(), "2026-11-24T12:00:00.000Z");
  assert.equal(draftDeliveryDate(), null);
  for (const date of ["2026-02-30", "2026-11-31", "2026-1-1", "bad"]) assert.throws(() => draftDeliveryDate(date));
});
test("draft pricing always uses current server prices and base quantities", () => {
  const line = priceDraftLine({ id: "bubble", name: "Bubble", sku: "079", unit: "Adet", salePrice: 200, vatRate: 1 }, { productId: "bubble", quantity: 20, manualShortShipment: false });
  assert.equal(line.lineSubtotal, 4000); assert.equal(line.lineTotal, 4040); assert.equal(line.approvedQuantity, null);
  assert.throws(() => priceDraftLine({ id: "x", name: "X", sku: "049", unit: "Adet", salePrice: 0.6, vatRate: 9100 }, { productId: "x", quantity: 100, manualShortShipment: false }));
});
test("branch search supports Turkish names and Latin brand spellings", () => {
  assert.equal(normalizeBranchSearch("İCEBERRY IŞIKLAR ŞUBESİ"), normalizeBranchSearch("iceberry isiklar subesi"));
  assert.equal(normalizeBranchSearch("  BAYRAMPAŞA  "), "bayrampasa");
});
