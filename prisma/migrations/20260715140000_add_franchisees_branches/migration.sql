CREATE TABLE "Franchisee" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "whatsapp" TEXT,
  "email" TEXT,
  "taxNumber" TEXT,
  "taxOffice" TEXT,
  "city" TEXT NOT NULL,
  "district" TEXT,
  "address" TEXT,
  "candidateId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SETUP',
  "contractDate" DATETIME,
  "contractStartDate" DATETIME,
  "contractEndDate" DATETIME,
  "defaultRoyaltyRate" REAL,
  "marketingContributionRate" REAL,
  "generalNotes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "archivedAt" DATETIME,
  CONSTRAINT "Franchisee_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Franchisee_candidateId_key" ON "Franchisee"("candidateId");
CREATE INDEX "Franchisee_status_archivedAt_idx" ON "Franchisee"("status","archivedAt");
CREATE INDEX "Franchisee_city_idx" ON "Franchisee"("city");

CREATE TABLE "Branch" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "franchiseeId" TEXT NOT NULL,
  "branchName" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "district" TEXT,
  "address" TEXT,
  "concept" TEXT NOT NULL,
  "locationType" TEXT NOT NULL,
  "openingDate" DATETIME,
  "plannedOpeningDate" DATETIME,
  "royaltyRate" REAL,
  "marketingContributionRate" REAL,
  "operationsManager" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "generalNotes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "archivedAt" DATETIME,
  CONSTRAINT "Branch_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Branch_franchiseeId_archivedAt_idx" ON "Branch"("franchiseeId","archivedAt");
CREATE INDEX "Branch_city_idx" ON "Branch"("city");
CREATE INDEX "Branch_status_plannedOpeningDate_idx" ON "Branch"("status","plannedOpeningDate");

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
  "id" TEXT NOT NULL PRIMARY KEY,"fileName" TEXT NOT NULL,"originalFileName" TEXT NOT NULL,"filePath" TEXT NOT NULL,"mimeType" TEXT NOT NULL,"fileSize" INTEGER NOT NULL,"documentType" TEXT NOT NULL,"version" TEXT NOT NULL,"description" TEXT,"candidateId" TEXT,"locationId" TEXT,"branchId" TEXT,"franchiseeId" TEXT,"uploadedBy" TEXT,"uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"customerShared" BOOLEAN NOT NULL DEFAULT false,"customerSharedAt" DATETIME,"archivedAt" DATETIME,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Document_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "Franchisee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" SELECT "id","fileName","originalFileName","filePath","mimeType","fileSize","documentType","version","description","candidateId","locationId",NULL,NULL,"uploadedBy","uploadedAt","customerShared","customerSharedAt","archivedAt","createdAt","updatedAt" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_fileName_key" ON "Document"("fileName");
CREATE INDEX "Document_candidateId_documentType_uploadedAt_idx" ON "Document"("candidateId","documentType","uploadedAt");
CREATE INDEX "Document_locationId_idx" ON "Document"("locationId");
CREATE INDEX "Document_branchId_idx" ON "Document"("branchId");
CREATE INDEX "Document_franchiseeId_idx" ON "Document"("franchiseeId");
CREATE INDEX "Document_documentType_archivedAt_idx" ON "Document"("documentType","archivedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
