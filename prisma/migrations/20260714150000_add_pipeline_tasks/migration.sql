ALTER TABLE "FranchiseCandidate" ADD COLUMN "assignedUserId" TEXT;

CREATE TABLE "CandidateTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "status" TEXT NOT NULL DEFAULT 'Açık',
    "assignedUserId" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CandidateTask_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CandidateTask_candidateId_dueDate_idx" ON "CandidateTask"("candidateId", "dueDate");
CREATE INDEX "CandidateTask_status_dueDate_idx" ON "CandidateTask"("status", "dueDate");
CREATE INDEX "CandidateTask_assignedUserId_idx" ON "CandidateTask"("assignedUserId");
