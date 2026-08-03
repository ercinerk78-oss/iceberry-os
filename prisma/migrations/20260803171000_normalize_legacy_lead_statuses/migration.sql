-- Normalize old free-text lead statuses to the canonical process status codes.
-- Data is preserved; only status labels are standardized.

UPDATE "Lead"
SET "status" = CASE
  WHEN "status" IN ('Yeni', 'Yeni Lead') THEN 'NEW'
  WHEN "status" IN ('Arandı', 'ArandÄ±') THEN 'TO_BE_CALLED'
  WHEN "status" IN ('Ulaşılamadı', 'UlaÅŸÄ±lamadÄ±') THEN 'UNREACHABLE'
  WHEN "status" = 'Randevu' THEN 'APPOINTMENT_SCHEDULED'
  WHEN "status" = 'Lokasyon Bekleniyor' THEN 'UNDER_EVALUATION'
  WHEN "status" IN ('Reddedildi', 'Kapatıldı', 'KapatÄ±ldÄ±') THEN 'CLOSED'
  WHEN "status" IN ('Adaya Dönüştürüldü', 'Adaya DÃ¶nÃ¼ÅŸtÃ¼rÃ¼ldÃ¼', 'Adaya DÃƒÂ¶nÃƒÂ¼Ã…Å¸tÃƒÂ¼rÃƒÂ¼ldÃƒÂ¼') THEN 'CONVERTED_TO_CANDIDATE'
  ELSE "status"
END
WHERE "status" IN (
  'Yeni',
  'Yeni Lead',
  'Arandı',
  'ArandÄ±',
  'Ulaşılamadı',
  'UlaÅŸÄ±lamadÄ±',
  'Randevu',
  'Lokasyon Bekleniyor',
  'Reddedildi',
  'Kapatıldı',
  'KapatÄ±ldÄ±',
  'Adaya Dönüştürüldü',
  'Adaya DÃ¶nÃ¼ÅŸtÃ¼rÃ¼ldÃ¼',
  'Adaya DÃƒÂ¶nÃƒÂ¼Ã…Å¸tÃƒÂ¼rÃƒÂ¼ldÃƒÂ¼'
);

UPDATE "Lead"
SET "processStatus" = CASE
  WHEN "processStatus" IN ('Yeni', 'Yeni Lead') THEN 'NEW'
  WHEN "processStatus" IN ('Arandı', 'ArandÄ±') THEN 'TO_BE_CALLED'
  WHEN "processStatus" IN ('Ulaşılamadı', 'UlaÅŸÄ±lamadÄ±') THEN 'UNREACHABLE'
  WHEN "processStatus" = 'Randevu' THEN 'APPOINTMENT_SCHEDULED'
  WHEN "processStatus" = 'Lokasyon Bekleniyor' THEN 'UNDER_EVALUATION'
  WHEN "processStatus" IN ('Reddedildi', 'Kapatıldı', 'KapatÄ±ldÄ±') THEN 'CLOSED'
  WHEN "processStatus" IN ('Adaya Dönüştürüldü', 'Adaya DÃ¶nÃ¼ÅŸtÃ¼rÃ¼ldÃ¼', 'Adaya DÃƒÂ¶nÃƒÂ¼Ã…Å¸tÃƒÂ¼rÃƒÂ¼ldÃƒÂ¼') THEN 'CONVERTED_TO_CANDIDATE'
  ELSE "processStatus"
END
WHERE "processStatus" IN (
  'Yeni',
  'Yeni Lead',
  'Arandı',
  'ArandÄ±',
  'Ulaşılamadı',
  'UlaÅŸÄ±lamadÄ±',
  'Randevu',
  'Lokasyon Bekleniyor',
  'Reddedildi',
  'Kapatıldı',
  'KapatÄ±ldÄ±',
  'Adaya Dönüştürüldü',
  'Adaya DÃ¶nÃ¼ÅŸtÃ¼rÃ¼ldÃ¼',
  'Adaya DÃƒÂ¶nÃƒÂ¼Ã…Å¸tÃƒÂ¼rÃƒÂ¼ldÃƒÂ¼'
);

UPDATE "FranchiseCandidate"
SET "status" = 'CONVERTED_TO_BRANCH'
WHERE "status" IN (
  'Şubeye Dönüştürüldü',
  'Åubeye DÃ¶nÃ¼ÅŸtÃ¼rÃ¼ldÃ¼',
  'Ã…Âubeye DÃƒÂ¶nÃƒÂ¼Ã…Å¸tÃƒÂ¼rÃƒÂ¼ldÃƒÂ¼'
);
