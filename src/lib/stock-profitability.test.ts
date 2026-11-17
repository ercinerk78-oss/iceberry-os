import assert from "node:assert/strict";
import test from "node:test";
import { nextAverageCost, profitability } from "./stock-profitability";

test("moving average weights an entry by the stock still on hand", () => {
  assert.equal(nextAverageCost(80, 10, 20, 15), 11);
  assert.equal(nextAverageCost(0, null, 20, 15), 15);
  assert.equal(nextAverageCost(80, null, 20, 15), null);
  assert.equal(nextAverageCost(80, 10, 20, null), null);
});

test("margin uses net sales and never treats missing cost as zero", () => {
  assert.deepEqual(profitability(200, 150, 0), { grossProfit: 50, margin: 25 });
  assert.deepEqual(profitability(200, 0, 1), { grossProfit: null, margin: null });
  assert.deepEqual(profitability(0, 0, 0), { grossProfit: 0, margin: null });
});
