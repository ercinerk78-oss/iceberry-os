ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "candidateId" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "sourceLeadId" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "tradeName" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "ownershipType" TEXT NOT NULL DEFAULT 'FRANCHISE';
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "conceptType" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'Türkiye';
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "mallName" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "floor" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "unitNumber" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "squareMeters" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "authorizedPersonName" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "authorizedPersonPhone" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "authorizedPersonEmail" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "taxOffice" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "taxNumber" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "closingDate" TIMESTAMP(3);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP(3);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP(3);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "leaseStartDate" TIMESTAMP(3);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "leaseEndDate" TIMESTAMP(3);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "rentAmount" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "turnoverRentRate" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "managerName" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "managerPhone" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "managerEmail" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "lastAuditAt" TIMESTAMP(3);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "lastAuditScore" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "healthScore" DOUBLE PRECISION;

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "oldValue" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "newValue" TEXT;

UPDATE "Branch" b
SET
  "branchCode" = COALESCE(b."branchCode", 'BR-' || upper(substr(b."id", 1, 8))),
  "legalName" = COALESCE(b."legalName", f."companyName"),
  "tradeName" = COALESCE(b."tradeName", b."branchName"),
  "conceptType" = COALESCE(b."conceptType", CASE WHEN b."concept" = 'SELF' THEN 'SELF_CAFE' ELSE b."concept" END),
  "authorizedPersonName" = COALESCE(b."authorizedPersonName", f."contactName"),
  "authorizedPersonPhone" = COALESCE(b."authorizedPersonPhone", f."phone"),
  "authorizedPersonEmail" = COALESCE(b."authorizedPersonEmail", f."email"),
  "phone" = COALESCE(b."phone", f."phone"),
  "email" = COALESCE(b."email", f."email"),
  "taxOffice" = COALESCE(b."taxOffice", f."taxOffice"),
  "taxNumber" = COALESCE(b."taxNumber", f."taxNumber"),
  "billingAddress" = COALESCE(b."billingAddress", f."address"),
  "contractStartDate" = COALESCE(b."contractStartDate", f."contractStartDate"),
  "contractEndDate" = COALESCE(b."contractEndDate", f."contractEndDate"),
  "royaltyRate" = COALESCE(b."royaltyRate", f."defaultRoyaltyRate"),
  "marketingContributionRate" = COALESCE(b."marketingContributionRate", f."marketingContributionRate"),
  "candidateId" = COALESCE(b."candidateId", f."candidateId")
FROM "Franchisee" f
WHERE b."franchiseeId" = f."id";

INSERT INTO "Branch" (
  "id", "franchiseeId", "candidateId", "branchCode", "branchName", "legalName", "tradeName",
  "ownershipType", "conceptType", "city", "district", "address", "country", "phone", "email",
  "authorizedPersonName", "authorizedPersonPhone", "authorizedPersonEmail", "taxOffice", "taxNumber",
  "billingAddress", "concept", "locationType", "plannedOpeningDate", "contractStartDate", "contractEndDate",
  "royaltyRate", "marketingContributionRate", "status", "generalNotes", "createdAt", "updatedAt", "archivedAt"
)
SELECT
  'branch_from_' || f."id",
  f."id",
  f."candidateId",
  'BR-' || upper(substr(f."id", 1, 8)),
  f."companyName",
  f."companyName",
  f."companyName",
  'FRANCHISE',
  'CORNER',
  f."city",
  f."district",
  f."address",
  'Türkiye',
  f."phone",
  f."email",
  f."contactName",
  f."phone",
  f."email",
  f."taxOffice",
  f."taxNumber",
  f."address",
  'CORNER',
  'OTHER',
  f."contractDate",
  f."contractStartDate",
  f."contractEndDate",
  f."defaultRoyaltyRate",
  f."marketingContributionRate",
  CASE WHEN f."status" = 'ACTIVE' THEN 'ACTIVE' WHEN f."status" = 'TERMINATED' THEN 'TERMINATED' ELSE 'CONTRACTED' END,
  f."generalNotes",
  f."createdAt",
  NOW(),
  f."archivedAt"
FROM "Franchisee" f
WHERE NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b."franchiseeId" = f."id");

UPDATE "Document" d
SET "branchId" = b."id"
FROM "Branch" b
WHERE d."franchiseeId" = b."franchiseeId" AND d."branchId" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Branch' AND column_name = 'franchiseeId' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "Branch" ALTER COLUMN "franchiseeId" DROP NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Branch_branchCode_key" ON "Branch"("branchCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Branch_candidateId_key" ON "Branch"("candidateId") WHERE "candidateId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Branch_candidateId_idx" ON "Branch"("candidateId");
CREATE INDEX IF NOT EXISTS "Branch_ownershipType_idx" ON "Branch"("ownershipType");
CREATE INDEX IF NOT EXISTS "Branch_conceptType_idx" ON "Branch"("conceptType");

CREATE TABLE IF NOT EXISTS "BranchUser" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BranchUser_branchId_userId_key" ON "BranchUser"("branchId", "userId");
CREATE INDEX IF NOT EXISTS "BranchUser_userId_idx" ON "BranchUser"("userId");
CREATE INDEX IF NOT EXISTS "BranchUser_branchId_role_idx" ON "BranchUser"("branchId", "role");

CREATE TABLE IF NOT EXISTS "BranchTask" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "branchId" TEXT NOT NULL,
  "assignedUserId" TEXT,
  "assignedRole" TEXT,
  "createdById" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "reviewerUserId" TEXT,
  "rejectionReason" TEXT,
  "completionNote" TEXT,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
  "requiresVideo" BOOLEAN NOT NULL DEFAULT false,
  "requiresFile" BOOLEAN NOT NULL DEFAULT false,
  "requiresDescription" BOOLEAN NOT NULL DEFAULT false,
  "requiresResultNote" BOOLEAN NOT NULL DEFAULT false,
  "minimumPhotoCount" INTEGER NOT NULL DEFAULT 0,
  "minimumVideoCount" INTEGER NOT NULL DEFAULT 0,
  "minimumFileCount" INTEGER NOT NULL DEFAULT 0,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BranchTask_branchId_status_idx" ON "BranchTask"("branchId", "status");
CREATE INDEX IF NOT EXISTS "BranchTask_assignedUserId_status_idx" ON "BranchTask"("assignedUserId", "status");
CREATE INDEX IF NOT EXISTS "BranchTask_dueDate_status_idx" ON "BranchTask"("dueDate", "status");
CREATE INDEX IF NOT EXISTS "BranchTask_sourceType_sourceId_idx" ON "BranchTask"("sourceType", "sourceId");

CREATE TABLE IF NOT EXISTS "TaskEvidence" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "evidenceType" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "storageKey" TEXT,
  "description" TEXT,
  "uploadedById" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaskEvidence_taskId_evidenceType_idx" ON "TaskEvidence"("taskId", "evidenceType");
CREATE INDEX IF NOT EXISTS "TaskEvidence_uploadedById_uploadedAt_idx" ON "TaskEvidence"("uploadedById", "uploadedAt");

CREATE TABLE IF NOT EXISTS "BranchAudit" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "score" DOUBLE PRECISION,
  "criticalCount" INTEGER NOT NULL DEFAULT 0,
  "summary" TEXT,
  "createdById" TEXT,
  "approvedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BranchAudit_branchId_auditDate_idx" ON "BranchAudit"("branchId", "auditDate");
CREATE INDEX IF NOT EXISTS "BranchAudit_status_auditDate_idx" ON "BranchAudit"("status", "auditDate");

CREATE TABLE IF NOT EXISTS "BranchDevelopmentPlan" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchDevelopmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BranchDevelopmentPlan_branchId_status_idx" ON "BranchDevelopmentPlan"("branchId", "status");
CREATE INDEX IF NOT EXISTS "BranchDevelopmentPlan_dueDate_status_idx" ON "BranchDevelopmentPlan"("dueDate", "status");

CREATE TABLE IF NOT EXISTS "OperationCalendarItem" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventType" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "taskId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationCalendarItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OperationCalendarItem_branchId_startAt_idx" ON "OperationCalendarItem"("branchId", "startAt");
CREATE INDEX IF NOT EXISTS "OperationCalendarItem_status_startAt_idx" ON "OperationCalendarItem"("status", "startAt");

CREATE TABLE IF NOT EXISTS "BranchTimelineEvent" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BranchTimelineEvent_branchId_createdAt_idx" ON "BranchTimelineEvent"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "BranchTimelineEvent_action_createdAt_idx" ON "BranchTimelineEvent"("action", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Branch_candidateId_fkey') THEN
    ALTER TABLE "Branch" ADD CONSTRAINT "Branch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchUser_branchId_fkey') THEN
    ALTER TABLE "BranchUser" ADD CONSTRAINT "BranchUser_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchUser_userId_fkey') THEN
    ALTER TABLE "BranchUser" ADD CONSTRAINT "BranchUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchTask_branchId_fkey') THEN
    ALTER TABLE "BranchTask" ADD CONSTRAINT "BranchTask_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaskEvidence_taskId_fkey') THEN
    ALTER TABLE "TaskEvidence" ADD CONSTRAINT "TaskEvidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "BranchTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchAudit_branchId_fkey') THEN
    ALTER TABLE "BranchAudit" ADD CONSTRAINT "BranchAudit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchDevelopmentPlan_branchId_fkey') THEN
    ALTER TABLE "BranchDevelopmentPlan" ADD CONSTRAINT "BranchDevelopmentPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OperationCalendarItem_branchId_fkey') THEN
    ALTER TABLE "OperationCalendarItem" ADD CONSTRAINT "OperationCalendarItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BranchTimelineEvent_branchId_fkey') THEN
    ALTER TABLE "BranchTimelineEvent" ADD CONSTRAINT "BranchTimelineEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "Role" ("id", "ad", "kod", "aciklama", "createdAt", "updatedAt")
VALUES
  ('role_branch_owner', 'Şube Sahibi', 'BRANCH_OWNER', 'Bağlı olduğu şubeyi ve şube görevlerini yönetir.', NOW(), NOW()),
  ('role_branch_manager', 'Şube Müdürü', 'BRANCH_MANAGER', 'Kendi şubesindeki görevleri ve operasyon aksiyonlarını yürütür.', NOW(), NOW()),
  ('role_branch_staff', 'Şube Personeli', 'BRANCH_STAFF', 'Kendisine atanan şube görevlerini tamamlar.', NOW(), NOW())
ON CONFLICT ("kod") DO UPDATE SET
  "ad" = EXCLUDED."ad",
  "aciklama" = EXCLUDED."aciklama",
  "updatedAt" = NOW();
