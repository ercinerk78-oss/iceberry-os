import assert from "node:assert/strict";
import test from "node:test";
import { isRoyaltyExcludedHotel, royaltyExcludedHotelNames } from "./royalty-eligibility";

test("all 21 named hotels are excluded with and without the branch suffix", () => {
  assert.equal(royaltyExcludedHotelNames.length, 21);
  for (const name of royaltyExcludedHotelNames) {
    assert.equal(isRoyaltyExcludedHotel({ branchName: name }), true, name);
    assert.equal(isRoyaltyExcludedHotel({ branchName: `${name} Şubesi` }), true, name);
    assert.equal(isRoyaltyExcludedHotel({ branchName: ` ${name.toLocaleUpperCase("tr-TR")} ŞUBESİ  ` }), true, name);
  }
});

test("hotel classification is excluded but ordinary branches remain eligible", () => {
  assert.equal(isRoyaltyExcludedHotel({ branchName: "Ortaca Şubesi" }), false);
  assert.equal(isRoyaltyExcludedHotel({ branchName: "Yeni Şube", conceptType: "HOTEL" }), true);
  assert.equal(isRoyaltyExcludedHotel({ branchName: "Yeni Şube", concept: "Otel" }), true);
});
