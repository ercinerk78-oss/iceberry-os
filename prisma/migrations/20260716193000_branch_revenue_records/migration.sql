CREATE TABLE IF NOT EXISTS "BranchRevenueRecord" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "grossRevenue" DOUBLE PRECISION NOT NULL,
  "netRevenue" DOUBLE PRECISION,
  "targetRevenue" DOUBLE PRECISION,
  "transactionCount" INTEGER,
  "averageTicket" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "rejectionReason" TEXT,
  "supportDocumentId" TEXT,
  "enteredById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchRevenueRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BranchRevenueRecord_branchId_periodType_periodStart_key" ON "BranchRevenueRecord"("branchId", "periodType", "periodStart");
CREATE INDEX IF NOT EXISTS "BranchRevenueRecord_branchId_year_month_idx" ON "BranchRevenueRecord"("branchId", "year", "month");
CREATE INDEX IF NOT EXISTS "BranchRevenueRecord_periodType_periodStart_idx" ON "BranchRevenueRecord"("periodType", "periodStart");
CREATE INDEX IF NOT EXISTS "BranchRevenueRecord_status_periodStart_idx" ON "BranchRevenueRecord"("status", "periodStart");
CREATE INDEX IF NOT EXISTS "BranchRevenueRecord_currency_idx" ON "BranchRevenueRecord"("currency");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchRevenueRecord_branchId_fkey') THEN
    ALTER TABLE "BranchRevenueRecord" ADD CONSTRAINT "BranchRevenueRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchRevenueRecord_supportDocumentId_fkey') THEN
    ALTER TABLE "BranchRevenueRecord" ADD CONSTRAINT "BranchRevenueRecord_supportDocumentId_fkey" FOREIGN KEY ("supportDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchRevenueRecord_enteredById_fkey') THEN
    ALTER TABLE "BranchRevenueRecord" ADD CONSTRAINT "BranchRevenueRecord_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchRevenueRecord_approvedById_fkey') THEN
    ALTER TABLE "BranchRevenueRecord" ADD CONSTRAINT "BranchRevenueRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
