import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeConceptCode, normalizeTag, parseMultiValue, parseTags, scoreBucket } from "@/lib/qualification";
import { candidateSchema } from "@/lib/validations/candidate";
import { leadCategoryChangeSchema } from "@/lib/validations/lead";

describe("Lead Intelligence kuralları", () => {
  it("aday puanını 1-10 aralığında kabul eder", () => {
    const valid = candidateSchema.safeParse(baseCandidate({ qualificationScore: "8" }));
    const invalid = candidateSchema.safeParse(baseCandidate({ qualificationScore: "11" }));

    assert.equal(valid.success, true);
    assert.equal(invalid.success, false);
  });

  it("hatalı form kategorisinde gerekçe ister", () => {
    const invalid = leadCategoryChangeSchema.safeParse({ leadCategory: "INVALID_FORM" });
    const valid = leadCategoryChangeSchema.safeParse({ leadCategory: "INVALID_FORM", invalidReason: "WRONG_PHONE" });

    assert.equal(invalid.success, false);
    assert.equal(valid.success, true);
  });

  it("diğer geçersizlik gerekçesinde açıklama ister", () => {
    const invalid = leadCategoryChangeSchema.safeParse({ leadCategory: "INVALID_FORM", invalidReason: "OTHER" });
    const valid = leadCategoryChangeSchema.safeParse({ leadCategory: "INVALID_FORM", invalidReason: "OTHER", invalidReasonDetail: "Yanlış sektör başvurusu" });

    assert.equal(invalid.success, false);
    assert.equal(valid.success, true);
  });

  it("çoklu konsept ve etiketleri tekrar etmeden ayrıştırır", () => {
    assert.deepEqual(parseMultiValue(["Cafe", "Corner", "Cafe", " "]), ["Cafe", "Corner"]);
    assert.deepEqual(parseTags("Yüksek Bütçe, hızlı karar, Yüksek Bütçe"), ["Yüksek Bütçe", "hızlı karar"]);
  });

  it("konsept kodu ve puan segmenti üretir", () => {
    assert.equal(normalizeConceptCode("Cadde Mağazası"), "CADDE_MAGAZASI");
    assert.equal(normalizeTag("  Hızlı Karar  "), "hızlı karar");
    assert.equal(scoreBucket(9), "9-10");
    assert.equal(scoreBucket(null), "Puansız");
  });
});

function baseCandidate(overrides: Record<string, string> = {}) {
  return {
    fullName: "Ayşe Demir",
    phone: "05551234567",
    whatsapp: "",
    email: "",
    city: "İstanbul",
    district: "Kadıköy",
    country: "Türkiye",
    investmentBudget: "2.000.000 TL",
    currency: "TRY",
    interestedConcept: "Cafe",
    source: "Instagram",
    status: "Yeni Lead",
    temperature: "Sıcak",
    qualificationScore: "",
    lastContactAt: "",
    nextFollowUpAt: "",
    lostReason: "",
    assignedUserId: "Ayşe Demir",
    generalNotes: "",
    ...overrides,
  };
}
