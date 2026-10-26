ALTER TABLE "BranchVisit"
  ADD COLUMN IF NOT EXISTS "visitScore" INTEGER;

ALTER TABLE "BranchHealthScoreSnapshot"
  ADD COLUMN IF NOT EXISTS "visitComponent" DECIMAL(5, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'BranchVisit_branchId_status_completedAt_idx'
  ) THEN
    CREATE INDEX "BranchVisit_branchId_status_completedAt_idx"
      ON "BranchVisit"("branchId", "status", "completedAt");
  END IF;
END $$;
