import assert from "node:assert/strict";
import test from "node:test";
import { calculateDeliveryRoyalty, defaultRoyaltyPeriod, royaltySettingsSchema } from "./delivery-royalty";

const input = { totalRevenue: "425030.00", deliveryRevenue: "126000.00", rate: 3, period: "2026-10" };
test("confirmed October example includes 60 percent delivery, 3 percent royalty and 20 percent VAT", () => {
  assert.deepEqual(calculateDeliveryRoyalty(input), { adjustedTotalRevenue: "425030.00", cafeRevenue: "299030.00", eligibleDeliveryRevenue: "75600.00", royaltyBase: "374630.00", netRoyalty: "11238.90", vat: "2247.78", totalRoyalty: "13486.68", exempt: false });
});

test("updated Excel deducts break-even before subtracting delivery revenue", () => {
  const result = calculateDeliveryRoyalty({ ...input, totalRevenue: "500000", deliveryRevenue: "100000", hasBreakEven: true, breakEven: "50000" });
  assert.equal(result.adjustedTotalRevenue, "450000.00");
  assert.equal(result.cafeRevenue, "350000.00");
  assert.equal(result.royaltyBase, "410000.00");
  assert.equal(result.totalRoyalty, "14760.00");
});

test("all delivery, break-even and royalty rate combinations follow the same formula", () => {
  for (const hasDelivery of [true, false]) for (const hasBreakEven of [true, false]) for (const rate of [2, 3]) {
    const result = calculateDeliveryRoyalty({ ...input, totalRevenue: "500000", hasDelivery, deliveryRevenue: hasDelivery ? "100000" : "0", hasBreakEven, breakEven: hasBreakEven ? "50000" : "0", rate });
    const base = 500000 - (hasBreakEven ? 50000 : 0) - (hasDelivery ? 40000 : 0);
    assert.equal(result.royaltyBase, base.toFixed(2));
    assert.equal(result.totalRoyalty, (base * rate / 100 * 1.2).toFixed(2));
  }
});

test("disabled options reject stale amounts; negative bases require review, not a silent clamp", () => {
  assert.throws(() => calculateDeliveryRoyalty({ ...input, hasDelivery: false }), /sıfır/);
  assert.throws(() => calculateDeliveryRoyalty({ ...input, breakEven: "10" }), /kapalıyken/);
  assert.throws(() => calculateDeliveryRoyalty({ ...input, hasBreakEven: true, breakEven: "500000" }), /negatif/);
  const result = calculateDeliveryRoyalty({ ...input, totalRevenue: "500000", deliveryRevenue: "100000", hasBreakEven: true, breakEven: "410000" });
  assert.equal(result.cafeRevenue, "-10000.00");
  assert.equal(result.royaltyBase, "50000.00");
});
test("two percent royalty changes only the royalty rate", () => {
  const result = calculateDeliveryRoyalty({ ...input, rate: 2 });
  assert.equal(result.netRoyalty, "7492.60"); assert.equal(result.vat, "1498.52"); assert.equal(result.totalRoyalty, "8991.12");
});
test("exemption follows revenue month, not the current invoice date", () => {
  assert.equal(calculateDeliveryRoyalty({ ...input, startMonth: "2026-11" }).totalRoyalty, "0.00");
  assert.equal(calculateDeliveryRoyalty({ ...input, startMonth: "2026-10" }).totalRoyalty, "13486.68");
  assert.equal(calculateDeliveryRoyalty({ ...input, startMonth: "2026-09" }).exempt, false);
  assert.equal(royaltySettingsSchema.safeParse({ rate: 3, startMonth: "2026-11", exemptionNote: "" }).success, false);
});
test("missing delivery is not silently treated as zero, but explicit zero is valid", () => {
  assert.throws(() => calculateDeliveryRoyalty({ ...input, deliveryRevenue: "" }));
  assert.equal(calculateDeliveryRoyalty({ ...input, deliveryRevenue: "0" }).totalRoyalty, "15301.08");
  assert.equal(calculateDeliveryRoyalty({ ...input, deliveryRevenue: input.totalRevenue }).totalRoyalty, "9180.65");
  assert.equal(calculateDeliveryRoyalty({ ...input, totalRevenue: "0", deliveryRevenue: "0" }).totalRoyalty, "0.00");
});
test("invalid amounts, unsupported rates and invalid periods cannot produce a royalty", () => {
  for (const deliveryRevenue of ["425031", "-1", "NaN", "Infinity", "126.000,00", "1.001"]) assert.throws(() => calculateDeliveryRoyalty({ ...input, deliveryRevenue }));
  for (const rate of [0, 1, 4, 20]) assert.throws(() => calculateDeliveryRoyalty({ ...input, rate }));
  for (const period of ["2026-00", "2026-13", "26-10", ""]) assert.throws(() => calculateDeliveryRoyalty({ ...input, period }));
});
test("money rounds half up without binary floating point drift", () => {
  const result = calculateDeliveryRoyalty({ ...input, totalRevenue: "0.50", deliveryRevenue: "0" });
  assert.equal(result.netRoyalty, "0.02"); assert.equal(result.totalRoyalty, "0.02");
  assert.equal(calculateDeliveryRoyalty({ ...input, totalRevenue: "0.17", deliveryRevenue: "0.01" }).netRoyalty, "0.00");
});
test("default royalty month is previous month in Turkey including the year boundary", () => {
  assert.equal(defaultRoyaltyPeriod(new Date("2026-11-24T10:00:00Z")), "2026-10");
  assert.equal(defaultRoyaltyPeriod(new Date("2026-12-31T22:00:00Z")), "2026-12");
  assert.equal(defaultRoyaltyPeriod(new Date("2027-01-01T10:00:00Z")), "2026-12");
});
