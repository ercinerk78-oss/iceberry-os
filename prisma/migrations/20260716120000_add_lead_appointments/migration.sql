ALTER TABLE "Lead" ADD COLUMN "leadCategory" TEXT;
ALTER TABLE "Lead" ADD COLUMN "nextFollowUpAt" TIMESTAMP(3);

CREATE TABLE "LeadAppointment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "appointmentTime" TEXT NOT NULL,
    "appointmentType" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "createdByUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "outcome" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadTask" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "status" TEXT NOT NULL DEFAULT 'Açık',
    "assignedUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_leadCategory_idx" ON "Lead"("leadCategory");
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");
CREATE INDEX "LeadAppointment_leadId_appointmentDate_idx" ON "LeadAppointment"("leadId", "appointmentDate");
CREATE INDEX "LeadAppointment_status_appointmentDate_idx" ON "LeadAppointment"("status", "appointmentDate");
CREATE INDEX "LeadAppointment_assignedUserId_idx" ON "LeadAppointment"("assignedUserId");
CREATE INDEX "LeadTask_leadId_dueDate_idx" ON "LeadTask"("leadId", "dueDate");
CREATE INDEX "LeadTask_status_dueDate_idx" ON "LeadTask"("status", "dueDate");
CREATE INDEX "LeadTask_assignedUserId_idx" ON "LeadTask"("assignedUserId");

ALTER TABLE "LeadAppointment" ADD CONSTRAINT "LeadAppointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadTask" ADD CONSTRAINT "LeadTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Role" ("id", "ad", "kod", "aciklama", "createdAt", "updatedAt")
VALUES (
  'role_appointment_department',
  'Randevu Departmanı',
  'APPOINTMENT_DEPARTMENT',
  'Lead arama, randevu ve görev akışlarını yönetir.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("kod") DO UPDATE SET
  "ad" = EXCLUDED."ad",
  "aciklama" = EXCLUDED."aciklama",
  "updatedAt" = CURRENT_TIMESTAMP;
