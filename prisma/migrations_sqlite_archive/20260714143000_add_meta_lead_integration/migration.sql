-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "normalizedPhone" TEXT;
ALTER TABLE "Lead" ADD COLUMN "normalizedEmail" TEXT;
ALTER TABLE "Lead" ADD COLUMN "externalLeadId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "metaFormId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "metaPageId" TEXT;

-- CreateTable
CREATE TABLE "IntegrationLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "externalId" TEXT,
  "message" TEXT NOT NULL,
  "payload" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_externalLeadId_key" ON "Lead"("externalLeadId");
CREATE INDEX "Lead_normalizedPhone_idx" ON "Lead"("normalizedPhone");
CREATE INDEX "Lead_normalizedEmail_idx" ON "Lead"("normalizedEmail");
CREATE INDEX "IntegrationLog_provider_status_createdAt_idx" ON "IntegrationLog"("provider", "status", "createdAt");
CREATE INDEX "IntegrationLog_externalId_idx" ON "IntegrationLog"("externalId");
