ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "processStatus" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "assignedUserId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastContactAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "investmentBudget" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "interestedLocation" TEXT;

UPDATE "Lead"
SET "processStatus" = COALESCE(NULLIF("processStatus", ''), "status", 'NEW')
WHERE "processStatus" IS NULL OR "processStatus" = '';

ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "startDateTime" TIMESTAMP(3);
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "endDateTime" TIMESTAMP(3);
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "meetingLink" TEXT;
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "result" TEXT;
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "rescheduleReason" TEXT;
ALTER TABLE "LeadAppointment" ADD COLUMN IF NOT EXISTS "previousAppointmentDate" TIMESTAMP(3);

UPDATE "LeadAppointment"
SET
  "createdById" = COALESCE("createdById", "createdByUserId"),
  "startDateTime" = COALESCE("startDateTime", "appointmentDate"),
  "type" = COALESCE("type", "appointmentType"),
  "description" = COALESCE("description", "notes"),
  "result" = COALESCE("result", "outcome")
WHERE "startDateTime" IS NULL
   OR "type" IS NULL
   OR "createdById" IS NULL
   OR "description" IS NULL
   OR "result" IS NULL;

CREATE INDEX IF NOT EXISTS "Lead_processStatus_leadDate_idx" ON "Lead"("processStatus", "leadDate");
CREATE INDEX IF NOT EXISTS "Lead_assignedUserId_idx" ON "Lead"("assignedUserId");
CREATE INDEX IF NOT EXISTS "LeadAppointment_startDateTime_idx" ON "LeadAppointment"("startDateTime");

INSERT INTO "Role" ("id", "ad", "kod", "aciklama", "createdAt", "updatedAt")
VALUES ('role_randevu_departmani', 'Randevu Departmanı', 'RANDEVU_DEPARTMANI', 'Lead arama, randevu ve görev yönetimi', NOW(), NOW())
ON CONFLICT ("kod") DO UPDATE SET
  "ad" = EXCLUDED."ad",
  "aciklama" = EXCLUDED."aciklama",
  "updatedAt" = NOW();
