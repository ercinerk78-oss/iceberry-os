-- Opening setup and document checklists for department-based branch opening follow-up.
-- Production-safe: creates new tables only, keeps existing data untouched.

CREATE TABLE IF NOT EXISTS "OpeningSetupChecklistItem" (
  "id" TEXT NOT NULL,
  "openingProjectId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "responsibleDepartment" TEXT NOT NULL DEFAULT 'OPERATIONS',
  "status" TEXT NOT NULL DEFAULT 'BEKLIYOR',
  "selectedOption" TEXT,
  "closingNote" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'TEMPLATE',
  "templateKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningSetupChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningDocumentChecklistItem" (
  "id" TEXT NOT NULL,
  "openingProjectId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'EVRAK',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "companyTypeCondition" TEXT,
  "responsibleDepartment" TEXT NOT NULL DEFAULT 'OPERATIONS',
  "status" TEXT NOT NULL DEFAULT 'TALEP_EDILDI',
  "note" TEXT,
  "documentId" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'TEMPLATE',
  "templateKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningDocumentChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpeningSetupChecklistItem_openingProjectId_templateKey_key" ON "OpeningSetupChecklistItem"("openingProjectId", "templateKey");
CREATE INDEX IF NOT EXISTS "OpeningSetupChecklistItem_openingProjectId_status_idx" ON "OpeningSetupChecklistItem"("openingProjectId", "status");
CREATE INDEX IF NOT EXISTS "OpeningSetupChecklistItem_branchId_status_idx" ON "OpeningSetupChecklistItem"("branchId", "status");
CREATE INDEX IF NOT EXISTS "OpeningSetupChecklistItem_responsibleDepartment_status_idx" ON "OpeningSetupChecklistItem"("responsibleDepartment", "status");
CREATE INDEX IF NOT EXISTS "OpeningSetupChecklistItem_archivedAt_idx" ON "OpeningSetupChecklistItem"("archivedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "OpeningDocumentChecklistItem_openingProjectId_templateKey_key" ON "OpeningDocumentChecklistItem"("openingProjectId", "templateKey");
CREATE INDEX IF NOT EXISTS "OpeningDocumentChecklistItem_openingProjectId_status_idx" ON "OpeningDocumentChecklistItem"("openingProjectId", "status");
CREATE INDEX IF NOT EXISTS "OpeningDocumentChecklistItem_branchId_status_idx" ON "OpeningDocumentChecklistItem"("branchId", "status");
CREATE INDEX IF NOT EXISTS "OpeningDocumentChecklistItem_responsibleDepartment_status_idx" ON "OpeningDocumentChecklistItem"("responsibleDepartment", "status");
CREATE INDEX IF NOT EXISTS "OpeningDocumentChecklistItem_archivedAt_idx" ON "OpeningDocumentChecklistItem"("archivedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OpeningSetupChecklistItem_openingProjectId_fkey') THEN
    ALTER TABLE "OpeningSetupChecklistItem"
      ADD CONSTRAINT "OpeningSetupChecklistItem_openingProjectId_fkey"
      FOREIGN KEY ("openingProjectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OpeningSetupChecklistItem_branchId_fkey') THEN
    ALTER TABLE "OpeningSetupChecklistItem"
      ADD CONSTRAINT "OpeningSetupChecklistItem_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OpeningDocumentChecklistItem_openingProjectId_fkey') THEN
    ALTER TABLE "OpeningDocumentChecklistItem"
      ADD CONSTRAINT "OpeningDocumentChecklistItem_openingProjectId_fkey"
      FOREIGN KEY ("openingProjectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OpeningDocumentChecklistItem_branchId_fkey') THEN
    ALTER TABLE "OpeningDocumentChecklistItem"
      ADD CONSTRAINT "OpeningDocumentChecklistItem_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "OpeningSetupChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OpeningDocumentChecklistItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "OpeningSetupChecklistItem" FROM PUBLIC;
REVOKE ALL ON TABLE "OpeningDocumentChecklistItem" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "OpeningSetupChecklistItem" FROM anon;
    REVOKE ALL ON TABLE "OpeningDocumentChecklistItem" FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "OpeningSetupChecklistItem" FROM authenticated;
    REVOKE ALL ON TABLE "OpeningDocumentChecklistItem" FROM authenticated;
  END IF;
END $$;
