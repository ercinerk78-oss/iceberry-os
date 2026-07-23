import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  branchConceptColor,
  branchConceptIcon,
  branchConceptLabel,
  legacyBranchConceptCode,
  normalizeBranchConceptCode,
  slugifyBranchConcept,
} from "@/lib/branch-concepts";

describe("Şube konsept mimarisi", () => {
  it("legacy konsept değerlerini güvenli şekilde eşleştirir", () => {
    assert.equal(legacyBranchConceptCode("Corner"), "CORNER");
    assert.equal(legacyBranchConceptCode("Self Cafe"), "SELF_CAFE");
    assert.equal(legacyBranchConceptCode("Self-Cafe"), "SELF_CAFE");
    assert.equal(legacyBranchConceptCode("Cafe"), "CAFE");
    assert.equal(legacyBranchConceptCode("Café"), "CAFE");
    assert.equal(legacyBranchConceptCode("Hotel Kiosk"), "HOTEL");
    assert.equal(legacyBranchConceptCode("Bilinmeyen"), null);
  });

  it("kod ve slug değerlerini yeni konseptler için normalize eder", () => {
    assert.equal(normalizeBranchConceptCode("Airport Express"), "AIRPORT_EXPRESS");
    assert.equal(slugifyBranchConcept("Üniversite Kiosk"), "universite-kiosk");
  });

  it("ilişkili konsept yoksa legacy alanlardan etiket, renk ve ikon üretir", () => {
    assert.equal(branchConceptLabel(null, "Hotel Kiosk"), "Hotel");
    assert.equal(branchConceptColor(null, "Self Cafe"), "#16a34a");
    assert.equal(branchConceptIcon(null, "Cafe"), "CupSoda");
  });
});
