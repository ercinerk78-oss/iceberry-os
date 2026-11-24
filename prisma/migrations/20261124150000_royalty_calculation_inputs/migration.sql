ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "royaltyCalculationSettings" JSONB;
ALTER TABLE "BranchRevenueRecord" ADD COLUMN IF NOT EXISTS "royaltyCalculationInputs" JSONB;
