-- Açılış kurulum planında Ekipman ve Operasyon Hazırlığı kalemleri için
-- beş aşamalı tedarik/lojistik durum takibi.
-- Mevcut kayıtlar korunur; yeni alanlar nullable başlar.

ALTER TABLE "OpeningSetupChecklistItem"
ADD COLUMN "logisticsStatus" TEXT,
ADD COLUMN "logisticsNote" TEXT,
ADD COLUMN "logisticsUpdatedAt" TIMESTAMP(3),
ADD COLUMN "logisticsUpdatedById" TEXT;

CREATE TABLE "OpeningSetupChecklistLogisticsUpdate" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OpeningSetupChecklistLogisticsUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpeningSetupChecklistLogisticsUpdate_itemId_createdAt_idx"
ON "OpeningSetupChecklistLogisticsUpdate"("itemId", "createdAt");

CREATE INDEX "OpeningSetupChecklistLogisticsUpdate_status_createdAt_idx"
ON "OpeningSetupChecklistLogisticsUpdate"("status", "createdAt");

ALTER TABLE "OpeningSetupChecklistLogisticsUpdate"
ADD CONSTRAINT "OpeningSetupChecklistLogisticsUpdate_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "OpeningSetupChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
