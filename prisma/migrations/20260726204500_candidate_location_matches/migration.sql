-- CreateTable
CREATE TABLE "CandidateLocationMatch" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "assignedByUserId" TEXT,
    "presentedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateLocationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateLocationMatch_candidateId_locationId_key" ON "CandidateLocationMatch"("candidateId", "locationId");

-- CreateIndex
CREATE INDEX "CandidateLocationMatch_candidateId_matchStatus_idx" ON "CandidateLocationMatch"("candidateId", "matchStatus");

-- CreateIndex
CREATE INDEX "CandidateLocationMatch_locationId_matchStatus_idx" ON "CandidateLocationMatch"("locationId", "matchStatus");

-- CreateIndex
CREATE INDEX "CandidateLocationMatch_nextFollowUpAt_idx" ON "CandidateLocationMatch"("nextFollowUpAt");

-- AddForeignKey
ALTER TABLE "CandidateLocationMatch" ADD CONSTRAINT "CandidateLocationMatch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateLocationMatch" ADD CONSTRAINT "CandidateLocationMatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CandidateLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill existing converted lead location matches into candidate location matches.
INSERT INTO "CandidateLocationMatch" (
    "id",
    "candidateId",
    "locationId",
    "matchStatus",
    "assignedByUserId",
    "presentedAt",
    "nextFollowUpAt",
    "notes",
    "createdAt",
    "updatedAt"
)
SELECT
    'clm_' || md5("LeadCandidateLocation"."id" || ':' || "Lead"."convertedCandidateId"),
    "Lead"."convertedCandidateId",
    "LeadCandidateLocation"."locationId",
    "LeadCandidateLocation"."matchStatus",
    "LeadCandidateLocation"."assignedByUserId",
    "LeadCandidateLocation"."presentedAt",
    "LeadCandidateLocation"."nextFollowUpAt",
    "LeadCandidateLocation"."notes",
    "LeadCandidateLocation"."createdAt",
    "LeadCandidateLocation"."updatedAt"
FROM "LeadCandidateLocation"
JOIN "Lead" ON "Lead"."id" = "LeadCandidateLocation"."leadId"
WHERE "Lead"."convertedCandidateId" IS NOT NULL
ON CONFLICT ("candidateId", "locationId") DO NOTHING;
