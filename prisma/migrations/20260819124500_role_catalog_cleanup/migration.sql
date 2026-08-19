-- Rol kataloğunu sadeleştirir ve yeni departman rolleri ekler.
-- Kullanıcı verisi silinmez; kaldırılan rol kodlarındaki kullanıcılar güvenli karşılıklarına taşınır.

INSERT INTO "Role" ("id", "ad", "kod", "aciklama", "createdAt", "updatedAt")
VALUES
  ('role_appointment_department', 'Randevu Departmanı', 'APPOINTMENT_DEPARTMENT', 'Lead arama, randevu ve görev yönetimi', NOW(), NOW()),
  ('role_architecture_project_implementation', 'Mimari Proje ve Uygulama Departmanı', 'ARCHITECTURE_PROJECT_IMPLEMENTATION', 'Mimari proje, uygulama ve açılış teknik süreçlerini yönetir.', NOW(), NOW()),
  ('role_training_department', 'Eğitim Departmanı', 'TRAINING_DEPARTMENT', 'Eğitim Akademisi, atama ve eğitim raporlarını yönetir.', NOW(), NOW()),
  ('role_advertising_operations', 'Reklam Uygulamaları Departmanı', 'ADVERTISING_OPERATIONS', 'Reklam, lead kaynakları ve kampanya operasyonlarını takip eder.', NOW(), NOW())
ON CONFLICT ("kod") DO UPDATE SET
  "ad" = EXCLUDED."ad",
  "aciklama" = EXCLUDED."aciklama",
  "updatedAt" = NOW();

-- Eski Türkçe randevu rolünü tek standart role taşı.
UPDATE "User"
SET
  "role" = 'APPOINTMENT_DEPARTMENT',
  "roleId" = (SELECT "id" FROM "Role" WHERE "kod" = 'APPOINTMENT_DEPARTMENT' LIMIT 1)
WHERE "role" = 'RANDEVU_DEPARTMANI'
   OR "roleId" IN (SELECT "id" FROM "Role" WHERE "kod" = 'RANDEVU_DEPARTMANI');

-- Eski mimari sorumlu rolünü yeni departman rolüne taşı.
UPDATE "User"
SET
  "role" = 'ARCHITECTURE_PROJECT_IMPLEMENTATION',
  "roleId" = (SELECT "id" FROM "Role" WHERE "kod" = 'ARCHITECTURE_PROJECT_IMPLEMENTATION' LIMIT 1)
WHERE "role" = 'ARCHITECTURAL_LEAD'
   OR "roleId" IN (SELECT "id" FROM "Role" WHERE "kod" = 'ARCHITECTURAL_LEAD');

UPDATE "OpeningTaskTemplate"
SET "defaultOwnerRole" = 'ARCHITECTURE_PROJECT_IMPLEMENTATION'
WHERE "defaultOwnerRole" = 'ARCHITECTURAL_LEAD';

UPDATE "OpeningMilestoneTemplate"
SET "defaultOwnerRole" = 'ARCHITECTURE_PROJECT_IMPLEMENTATION'
WHERE "defaultOwnerRole" = 'ARCHITECTURAL_LEAD';

-- Eski eğitim yöneticisi rolünü yeni departman rolüne taşı.
UPDATE "User"
SET
  "role" = 'TRAINING_DEPARTMENT',
  "roleId" = (SELECT "id" FROM "Role" WHERE "kod" = 'TRAINING_DEPARTMENT' LIMIT 1)
WHERE "role" = 'TRAINING_MANAGER'
   OR "roleId" IN (SELECT "id" FROM "Role" WHERE "kod" = 'TRAINING_MANAGER');

UPDATE "LearningPath"
SET "targetRoleCode" = 'TRAINING_DEPARTMENT'
WHERE "targetRoleCode" = 'TRAINING_MANAGER';

UPDATE "CorporateDocument"
SET "ownerRoleCode" = 'TRAINING_DEPARTMENT'
WHERE "ownerRoleCode" = 'TRAINING_MANAGER';

-- Şube personeli rolünü kaldırırken mevcut kullanıcı ve atamaları Şube Müdürü rolüne taşı.
INSERT INTO "Role" ("id", "ad", "kod", "aciklama", "createdAt", "updatedAt")
VALUES ('role_branch_manager', 'Şube Müdürü', 'BRANCH_MANAGER', 'Şube operasyonlarını ve görevlerini yönetir.', NOW(), NOW())
ON CONFLICT ("kod") DO UPDATE SET
  "ad" = EXCLUDED."ad",
  "aciklama" = EXCLUDED."aciklama",
  "updatedAt" = NOW();

UPDATE "User"
SET
  "role" = 'BRANCH_MANAGER',
  "roleId" = (SELECT "id" FROM "Role" WHERE "kod" = 'BRANCH_MANAGER' LIMIT 1)
WHERE "role" = 'BRANCH_STAFF'
   OR "roleId" IN (SELECT "id" FROM "Role" WHERE "kod" = 'BRANCH_STAFF');

UPDATE "BranchUser"
SET "role" = 'BRANCH_MANAGER'
WHERE "role" = 'BRANCH_STAFF';

UPDATE "BranchTask"
SET "assignedRole" = 'BRANCH_MANAGER'
WHERE "assignedRole" = 'BRANCH_STAFF';

UPDATE "LearningPath"
SET "targetRoleCode" = 'BRANCH_MANAGER'
WHERE "targetRoleCode" = 'BRANCH_STAFF';

UPDATE "CorporateDocument"
SET "ownerRoleCode" = 'BRANCH_MANAGER'
WHERE "ownerRoleCode" = 'BRANCH_STAFF';

-- Katalogda görünmemesi gereken eski rol satırlarını kaldır.
DELETE FROM "Role"
WHERE "kod" IN ('RANDEVU_DEPARTMANI', 'ARCHITECTURAL_LEAD', 'TRAINING_MANAGER', 'BRANCH_STAFF');
