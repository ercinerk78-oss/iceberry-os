CREATE TABLE IF NOT EXISTS "BranchConcept" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT NOT NULL DEFAULT 'Store',
  "color" TEXT NOT NULL DEFAULT '#2f5f20',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "minimumInvestment" DOUBLE PRECISION,
  "maximumInvestment" DOUBLE PRECISION,
  "averageAreaSqm" DOUBLE PRECISION,
  "averagePersonnel" INTEGER,
  "royaltyModel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchConcept_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BranchConcept_code_key" ON "BranchConcept"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "BranchConcept_name_key" ON "BranchConcept"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "BranchConcept_slug_key" ON "BranchConcept"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "BranchConcept_code_lower_key" ON "BranchConcept"(lower("code"));
CREATE UNIQUE INDEX IF NOT EXISTS "BranchConcept_name_lower_key" ON "BranchConcept"(lower("name"));
CREATE UNIQUE INDEX IF NOT EXISTS "BranchConcept_slug_lower_key" ON "BranchConcept"(lower("slug"));
CREATE INDEX IF NOT EXISTS "BranchConcept_isActive_sortOrder_idx" ON "BranchConcept"("isActive", "sortOrder");

INSERT INTO "BranchConcept" (
  "id", "code", "name", "slug", "description", "icon", "color", "isActive", "sortOrder",
  "minimumInvestment", "maximumInvestment", "averageAreaSqm", "averagePersonnel", "royaltyModel"
)
VALUES
  ('branch_concept_corner', 'CORNER', 'Corner', 'corner', 'Kompakt alanlarda hızlı servis odaklı şube konsepti.', 'PanelTop', '#2563eb', true, 10, NULL, NULL, NULL, NULL, NULL),
  ('branch_concept_self_cafe', 'SELF_CAFE', 'Self Cafe', 'self-cafe', 'Self servis akışına uygun cafe konsepti.', 'Coffee', '#16a34a', true, 20, NULL, NULL, NULL, NULL, NULL),
  ('branch_concept_cafe', 'CAFE', 'Cafe', 'cafe', 'Tam cafe deneyimi sunan ana şube konsepti.', 'CupSoda', '#f59e0b', true, 30, NULL, NULL, NULL, NULL, NULL),
  ('branch_concept_hotel', 'HOTEL', 'Hotel', 'hotel', 'Otel içi veya konaklama lokasyonlarına uyumlu şube konsepti.', 'Hotel', '#7c3aed', true, 40, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "conceptId" TEXT;

WITH legacy_map AS (
  SELECT
    b."id" AS "branchId",
    CASE
      WHEN upper(regexp_replace(translate(trim(COALESCE(b."conceptType", b."concept", '')), 'İIıĞğÜüŞşÖöÇçÉéÈèÊê', 'IIiGgUuSsOoCcEeEeEe'), '[^A-Za-z0-9]+', '_', 'g')) IN ('CORNER') THEN 'CORNER'
      WHEN upper(regexp_replace(translate(trim(COALESCE(b."conceptType", b."concept", '')), 'İIıĞğÜüŞşÖöÇçÉéÈèÊê', 'IIiGgUuSsOoCcEeEeEe'), '[^A-Za-z0-9]+', '_', 'g')) IN ('SELF', 'SELF_CAFE', 'SELFCAFE') THEN 'SELF_CAFE'
      WHEN upper(regexp_replace(translate(trim(COALESCE(b."conceptType", b."concept", '')), 'İIıĞğÜüŞşÖöÇçÉéÈèÊê', 'IIiGgUuSsOoCcEeEeEe'), '[^A-Za-z0-9]+', '_', 'g')) IN ('CAFE') THEN 'CAFE'
      WHEN upper(regexp_replace(translate(trim(COALESCE(b."conceptType", b."concept", '')), 'İIıĞğÜüŞşÖöÇçÉéÈèÊê', 'IIiGgUuSsOoCcEeEeEe'), '[^A-Za-z0-9]+', '_', 'g')) IN ('HOTEL', 'HOTEL_KIOSK', 'OTEL', 'OTEL_KIOSK') THEN 'HOTEL'
      ELSE NULL
    END AS "conceptCode"
  FROM "Branch" b
  WHERE b."conceptId" IS NULL
),
matched AS (
  SELECT lm."branchId", bc."id" AS "conceptId", bc."code"
  FROM legacy_map lm
  JOIN "BranchConcept" bc ON bc."code" = lm."conceptCode"
)
UPDATE "Branch" b
SET
  "conceptId" = matched."conceptId",
  "conceptType" = COALESCE(b."conceptType", matched."code")
FROM matched
WHERE b."id" = matched."branchId"
  AND b."conceptId" IS NULL;

CREATE INDEX IF NOT EXISTS "Branch_conceptId_idx" ON "Branch"("conceptId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Branch_conceptId_fkey'
  ) THEN
    ALTER TABLE "Branch"
      ADD CONSTRAINT "Branch_conceptId_fkey"
      FOREIGN KEY ("conceptId") REFERENCES "BranchConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
