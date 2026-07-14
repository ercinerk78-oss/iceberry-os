PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Document" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "documentType" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "description" TEXT,
  "candidateId" TEXT,
  "locationId" TEXT,
  "branchId" TEXT,
  "uploadedBy" TEXT,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customerShared" BOOLEAN NOT NULL DEFAULT false,
  "customerSharedAt" DATETIME,
  "archivedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Document_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "FranchiseCandidate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Document" ("id","fileName","originalFileName","filePath","mimeType","fileSize","documentType","version","description","candidateId","uploadedAt","createdAt","updatedAt")
SELECT "id","storedName","fileName","storedName","mimeType","size",CASE WHEN "category"='DEALER_STRATEGY' THEN 'BRANCH_DEVELOPMENT_STRATEGY' WHEN "mimeType"='application/pdf' THEN 'LOCATION_ANALYSIS_PDF' ELSE 'LOCATION_ANALYSIS_VISUAL' END,"version","description","candidateId","createdAt","createdAt","updatedAt" FROM "CandidateDocument";

DROP TABLE "CandidateDocument";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_fileName_key" ON "Document"("fileName");
CREATE INDEX "Document_candidateId_documentType_uploadedAt_idx" ON "Document"("candidateId","documentType","uploadedAt");
CREATE INDEX "Document_locationId_idx" ON "Document"("locationId");
CREATE INDEX "Document_branchId_idx" ON "Document"("branchId");
CREATE INDEX "Document_documentType_archivedAt_idx" ON "Document"("documentType","archivedAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
