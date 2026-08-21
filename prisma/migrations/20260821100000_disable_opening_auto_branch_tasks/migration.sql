-- Açılış projesi oluşturulurken otomatik bayi/şube görevi atanmasını kapatır.
-- Manuel oluşturulan BranchTask kayıtlarına dokunmaz.

UPDATE "OpeningTaskTemplate"
SET "autoCreate" = false
WHERE "autoCreate" = true;

UPDATE "OpeningMilestone"
SET "relatedTaskId" = NULL
WHERE "relatedTaskId" IN (
  SELECT "id"
  FROM "BranchTask"
  WHERE "sourceType" = 'OPENING_PROJECT'
);

DELETE FROM "TaskEvidence"
WHERE "taskId" IN (
  SELECT "id"
  FROM "BranchTask"
  WHERE "sourceType" = 'OPENING_PROJECT'
);

DELETE FROM "BranchTask"
WHERE "sourceType" = 'OPENING_PROJECT';
