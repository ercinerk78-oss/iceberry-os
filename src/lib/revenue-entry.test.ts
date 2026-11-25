import assert from "node:assert/strict";
import test from "node:test";
import { formatRevenueEntry, revenueEntryValue, REVENUE_MONTH_NAMES } from "./revenue-entry";

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
