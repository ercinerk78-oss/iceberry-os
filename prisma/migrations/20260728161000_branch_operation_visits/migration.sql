CREATE TABLE "BranchVisit" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "visitType" TEXT NOT NULL DEFAULT 'OPERATION',
  "plannedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "visitorName" TEXT,
  "plannedById" TEXT,
  "completedById" TEXT,
  "notes" TEXT,
  "resultNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BranchVisit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BranchVisit"
  ADD CONSTRAINT "BranchVisit_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BranchVisit_branchId_plannedAt_idx" ON "BranchVisit"("branchId", "plannedAt");
CREATE INDEX "BranchVisit_status_plannedAt_idx" ON "BranchVisit"("status", "plannedAt");
CREATE INDEX "BranchVisit_completedAt_idx" ON "BranchVisit"("completedAt");
