ALTER TABLE "FranchiseCandidate" ADD COLUMN IF NOT EXISTS "qualificationScore" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FranchiseCandidate_qualificationScore_check'
  ) THEN
    ALTER TABLE "FranchiseCandidate"
      ADD CONSTRAINT "FranchiseCandidate_qualificationScore_check"
      CHECK ("qualificationScore" IS NULL OR ("qualificationScore" >= 1 AND "qualificationScore" <= 10));
  END IF;
END $$;

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "invalidReason" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "invalidReasonDetail" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "sourceData" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "sourceFieldValues" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "manualOverrideFields" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "Concept" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CandidateConcept" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateConcept_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadConcept" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadConcept_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CandidateTag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CandidateTagLink" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateTagLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CandidateTimelineEvent" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "actorName" TEXT,
  "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Concept_code_key" ON "Concept"("code");
CREATE INDEX IF NOT EXISTS "Concept_isActive_name_idx" ON "Concept"("isActive", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateConcept_candidateId_conceptId_key" ON "CandidateConcept"("candidateId", "conceptId");
CREATE INDEX IF NOT EXISTS "CandidateConcept_conceptId_idx" ON "CandidateConcept"("conceptId");
CREATE UNIQUE INDEX IF NOT EXISTS "LeadConcept_leadId_conceptId_key" ON "LeadConcept"("leadId", "conceptId");
CREATE INDEX IF NOT EXISTS "LeadConcept_conceptId_idx" ON "LeadConcept"("conceptId");
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateTag_normalized_key" ON "CandidateTag"("normalized");
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateTagLink_candidateId_tagId_key" ON "CandidateTagLink"("candidateId", "tagId");
CREATE INDEX IF NOT EXISTS "CandidateTagLink_tagId_idx" ON "CandidateTagLink"("tagId");
CREATE INDEX IF NOT EXISTS "CandidateTimelineEvent_candidateId_eventDate_idx" ON "CandidateTimelineEvent"("candidateId", "eventDate");
CREATE INDEX IF NOT EXISTS "CandidateTimelineEvent_eventType_idx" ON "CandidateTimelineEvent"("eventType");
CREATE INDEX IF NOT EXISTS "FranchiseCandidate_qualificationScore_idx" ON "FranchiseCandidate"("qualificationScore");
CREATE INDEX IF NOT EXISTS "Lead_invalidReason_idx" ON "Lead"("invalidReason");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateConcept_candidateId_fkey') THEN
    ALTER TABLE "CandidateConcept" ADD CONSTRAINT "CandidateConcept_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateConcept_conceptId_fkey') THEN
    ALTER TABLE "CandidateConcept" ADD CONSTRAINT "CandidateConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadConcept_leadId_fkey') THEN
    ALTER TABLE "LeadConcept" ADD CONSTRAINT "LeadConcept_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadConcept_conceptId_fkey') THEN
    ALTER TABLE "LeadConcept" ADD CONSTRAINT "LeadConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateTagLink_candidateId_fkey') THEN
    ALTER TABLE "CandidateTagLink" ADD CONSTRAINT "CandidateTagLink_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateTagLink_tagId_fkey') THEN
    ALTER TABLE "CandidateTagLink" ADD CONSTRAINT "CandidateTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CandidateTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateTimelineEvent_candidateId_fkey') THEN
    ALTER TABLE "CandidateTimelineEvent" ADD CONSTRAINT "CandidateTimelineEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

WITH concept_names AS (
  SELECT DISTINCT trim("interestedConcept") AS name
  FROM "FranchiseCandidate"
  WHERE trim(COALESCE("interestedConcept", '')) <> ''
  UNION
  SELECT DISTINCT trim("requestedConcept") AS name
  FROM "Lead"
  WHERE trim(COALESCE("requestedConcept", '')) <> ''
),
normalized AS (
  SELECT
    name,
    'concept_' || md5(lower(name)) AS id,
    upper(regexp_replace(lower(translate(name, 'İIıĞğÜüŞşÖöÇç', 'IIiGgUuSsOoCc')), '[^a-z0-9]+', '_', 'g')) AS code
  FROM concept_names
)
INSERT INTO "Concept" ("id", "name", "code", "isActive", "createdAt", "updatedAt")
SELECT id, name, code, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM normalized
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "CandidateConcept" ("id", "candidateId", "conceptId", "createdAt")
SELECT 'candidate_concept_' || md5(c."id" || ':' || co."id"), c."id", co."id", CURRENT_TIMESTAMP
FROM "FranchiseCandidate" c
JOIN "Concept" co ON co."code" = upper(regexp_replace(lower(translate(trim(c."interestedConcept"), 'İIıĞğÜüŞşÖöÇç', 'IIiGgUuSsOoCc')), '[^a-z0-9]+', '_', 'g'))
WHERE trim(COALESCE(c."interestedConcept", '')) <> ''
ON CONFLICT ("candidateId", "conceptId") DO NOTHING;

INSERT INTO "LeadConcept" ("id", "leadId", "conceptId", "createdAt")
SELECT 'lead_concept_' || md5(l."id" || ':' || co."id"), l."id", co."id", CURRENT_TIMESTAMP
FROM "Lead" l
JOIN "Concept" co ON co."code" = upper(regexp_replace(lower(translate(trim(l."requestedConcept"), 'İIıĞğÜüŞşÖöÇç', 'IIiGgUuSsOoCc')), '[^a-z0-9]+', '_', 'g'))
WHERE trim(COALESCE(l."requestedConcept", '')) <> ''
ON CONFLICT ("leadId", "conceptId") DO NOTHING;
