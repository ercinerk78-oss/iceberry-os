-- Iceberry Academy Enterprise LMS
-- Production-safe migration: only additive changes, no destructive operations.

ALTER TABLE "TrainingProgram"
  ADD COLUMN IF NOT EXISTS "instructorName" TEXT,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tags" TEXT;

CREATE TABLE IF NOT EXISTS "AcademyMediaAsset" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "lessonId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "mediaType" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "originalFileName" TEXT,
  "fileName" TEXT,
  "filePath" TEXT,
  "fileUrl" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "durationSeconds" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "thumbnailUrl" TEXT,
  "uploadedById" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyMediaAsset_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademyMediaAsset_programId_fkey'
  ) THEN
    ALTER TABLE "AcademyMediaAsset"
      ADD CONSTRAINT "AcademyMediaAsset_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademyMediaAsset_lessonId_fkey'
  ) THEN
    ALTER TABLE "AcademyMediaAsset"
      ADD CONSTRAINT "AcademyMediaAsset_lessonId_fkey"
      FOREIGN KEY ("lessonId") REFERENCES "TrainingLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TrainingProgram_status_sortOrder_idx" ON "TrainingProgram"("status", "sortOrder");
CREATE INDEX IF NOT EXISTS "AcademyMediaAsset_programId_sortOrder_idx" ON "AcademyMediaAsset"("programId", "sortOrder");
CREATE INDEX IF NOT EXISTS "AcademyMediaAsset_lessonId_idx" ON "AcademyMediaAsset"("lessonId");
CREATE INDEX IF NOT EXISTS "AcademyMediaAsset_mediaType_idx" ON "AcademyMediaAsset"("mediaType");
CREATE INDEX IF NOT EXISTS "AcademyMediaAsset_sourceType_idx" ON "AcademyMediaAsset"("sourceType");
CREATE INDEX IF NOT EXISTS "AcademyMediaAsset_archivedAt_idx" ON "AcademyMediaAsset"("archivedAt");

INSERT INTO "AcademyMediaAsset" (
  "id",
  "programId",
  "lessonId",
  "title",
  "description",
  "mediaType",
  "sourceType",
  "originalFileName",
  "fileName",
  "filePath",
  "mimeType",
  "fileSize",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('academy-media-', lesson."id"),
  module."programId",
  lesson."id",
  lesson."title",
  lesson."description",
  CASE
    WHEN lesson."lessonType" = 'VIDEO' THEN 'VIDEO'
    WHEN lesson."lessonType" = 'PDF' THEN 'PDF'
    WHEN lesson."lessonType" = 'IMAGE' THEN 'IMAGE'
    WHEN lesson."lessonType" = 'EXTERNAL_LINK' THEN 'LINK'
    WHEN lesson."lessonType" = 'DOCUMENT' THEN 'DOCUMENT'
    ELSE 'TEXT'
  END,
  CASE
    WHEN lesson."externalUrl" IS NOT NULL THEN 'LINK'
    WHEN lesson."videoDocumentId" IS NOT NULL THEN 'DOCUMENT_REFERENCE'
    WHEN lesson."relatedDocumentId" IS NOT NULL THEN 'DOCUMENT_REFERENCE'
    ELSE 'LESSON'
  END,
  document."originalFileName",
  document."fileName",
  document."filePath",
  document."mimeType",
  document."fileSize",
  lesson."sortOrder",
  lesson."createdAt",
  lesson."updatedAt"
FROM "TrainingLesson" lesson
JOIN "TrainingModule" module ON module."id" = lesson."moduleId"
LEFT JOIN "Document" document ON document."id" = COALESCE(lesson."videoDocumentId", lesson."relatedDocumentId")
WHERE lesson."lessonType" IN ('VIDEO', 'DOCUMENT', 'PDF', 'IMAGE', 'EXTERNAL_LINK')
ON CONFLICT ("id") DO NOTHING;
