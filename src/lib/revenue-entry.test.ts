import assert from "node:assert/strict";
import test from "node:test";
import { formatRevenueEntry, revenueEntryValue, REVENUE_MONTH_NAMES, savedRevenueDelivery } from "./revenue-entry";
import { branchRevenueSchema } from "./validations/branch-revenue";

test("Turkish revenue entry groups thousands and retains up to three decimals", () => {
  for (const [input, display, stored] of [["500000", "500.000", "500000"], ["425030,125", "425.030,125", "425030.125"], ["1.234.567,89", "1.234.567,89", "1234567.89"], ["0", "0", "0"], [",5", "0,5", "0.5"], ["", "", ""]]) {
    assert.equal(formatRevenueEntry(input), display);
    assert.equal(revenueEntryValue(display), stored);
  }
  for (const invalid of ["-1", "1e6", "abc", "1,2345", "1,2,3"]) assert.equal(formatRevenueEntry(invalid), null);
});

test("period picker provides all twelve Turkish month names", () => {
  assert.equal(REVENUE_MONTH_NAMES.length, 12);
  assert.equal(REVENUE_MONTH_NAMES[0], "Ocak");
  assert.equal(REVENUE_MONTH_NAMES[10], "Kasım");
  assert.equal(REVENUE_MONTH_NAMES[11], "Aralık");
});

test("delivery entry is optional, accepts zero and decimals, and cannot exceed total revenue", () => {
  const base = { branchId: "b", year: "2026", month: "11", grossRevenue: "425030", currency: "TRY", source: "MANUAL" };
  for (const deliveryRevenue of [undefined, "", "0", "126000", "126000.125", "425030"]) {
    assert.equal(branchRevenueSchema.safeParse({ ...base, deliveryRevenue }).success, true);
  }
  for (const deliveryRevenue of ["425031", "-1", "Infinity", "NaN", "1.2345", "126.000,50"]) {
    assert.equal(branchRevenueSchema.safeParse({ ...base, deliveryRevenue }).success, false);
  }
});

test("delivery inputs can be read before a royalty calculation exists without inventing old values", () => {
  assert.equal(savedRevenueDelivery({ deliveryRevenue: "126000.125" }), "126000.125");
  assert.equal(savedRevenueDelivery({ deliveryRevenue: "0" }), "0");
  assert.equal(savedRevenueDelivery({ deliveryRevenue: "126000", rate: 3 }), "126000");
  for (const value of [null, {}, [], { deliveryRevenue: "oops" }, { deliveryRevenue: -1 }]) assert.equal(savedRevenueDelivery(value), undefined);
});
