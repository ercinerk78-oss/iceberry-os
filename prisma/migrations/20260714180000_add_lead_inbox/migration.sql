CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "requestedConcept" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Yeni',
    "leadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedCandidateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Lead_status_leadDate_idx" ON "Lead"("status", "leadDate");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE INDEX "Lead_convertedCandidateId_idx" ON "Lead"("convertedCandidateId");
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");
