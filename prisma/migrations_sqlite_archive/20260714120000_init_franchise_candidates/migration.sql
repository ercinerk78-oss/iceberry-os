CREATE TABLE "FranchiseCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Türkiye',
    "investmentBudget" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "interestedConcept" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Yeni Lead',
    "temperature" TEXT NOT NULL DEFAULT 'Ilık',
    "generalNotes" TEXT,
    "nextFollowUpAt" DATETIME,
    "lastContactAt" DATETIME,
    "lostReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME
);

CREATE TABLE "CandidateInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "interactionDate" DATETIME NOT NULL,
    "nextAction" TEXT,
    "reminderAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CandidateInteraction_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "FranchiseCandidate_archivedAt_createdAt_idx" ON "FranchiseCandidate"("archivedAt", "createdAt");
CREATE INDEX "FranchiseCandidate_city_idx" ON "FranchiseCandidate"("city");
CREATE INDEX "FranchiseCandidate_status_idx" ON "FranchiseCandidate"("status");
CREATE INDEX "CandidateInteraction_candidateId_interactionDate_idx" ON "CandidateInteraction"("candidateId", "interactionDate");
