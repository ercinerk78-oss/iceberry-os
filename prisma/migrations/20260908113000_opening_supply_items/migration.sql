-- Açılış Yönetimi içinde Ekipman, Züccaciye ve Açılış Malı ürün bazlı takip altyapısı.
-- Mevcut açılış, checklist, depo veya stok kayıtları silinmez/değiştirilmez.

CREATE TABLE "OpeningSupplyItem" (
  "id" TEXT NOT NULL,
  "openingProjectId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "category" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "plannedQuantity" DOUBLE PRECISION,
  "quantityUnit" TEXT NOT NULL DEFAULT 'Adet',
  "responsibleParty" TEXT NOT NULL DEFAULT 'ICEBERRY',
  "status" TEXT NOT NULL DEFAULT 'BEKLIYOR',
  "logisticsStatus" TEXT,
  "logisticsNote" TEXT,
  "logisticsUpdatedAt" TIMESTAMP(3),
  "logisticsUpdatedById" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'TEMPLATE',
  "templateKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OpeningSupplyItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningSupplyItemUpdate" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OpeningSupplyItemUpdate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpeningSupplyItem_openingProjectId_templateKey_key"
ON "OpeningSupplyItem"("openingProjectId", "templateKey");

CREATE INDEX "OpeningSupplyItem_openingProjectId_section_archivedAt_idx"
ON "OpeningSupplyItem"("openingProjectId", "section", "archivedAt");

CREATE INDEX "OpeningSupplyItem_branchId_section_archivedAt_idx"
ON "OpeningSupplyItem"("branchId", "section", "archivedAt");

CREATE INDEX "OpeningSupplyItem_section_status_idx"
ON "OpeningSupplyItem"("section", "status");

CREATE INDEX "OpeningSupplyItem_logisticsStatus_idx"
ON "OpeningSupplyItem"("logisticsStatus");

CREATE INDEX "OpeningSupplyItemUpdate_itemId_createdAt_idx"
ON "OpeningSupplyItemUpdate"("itemId", "createdAt");

CREATE INDEX "OpeningSupplyItemUpdate_status_createdAt_idx"
ON "OpeningSupplyItemUpdate"("status", "createdAt");

ALTER TABLE "OpeningSupplyItem"
ADD CONSTRAINT "OpeningSupplyItem_openingProjectId_fkey"
FOREIGN KEY ("openingProjectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OpeningSupplyItem"
ADD CONSTRAINT "OpeningSupplyItem_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OpeningSupplyItemUpdate"
ADD CONSTRAINT "OpeningSupplyItemUpdate_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "OpeningSupplyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
