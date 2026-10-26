-- Açılış kurulum kalemlerinde planlanan adet/birim takibi.
-- Mevcut kayıtlar korunur; adet alanı boş başlayabilir, birim varsayılan "Adet" olur.

ALTER TABLE "OpeningSetupChecklistItem"
ADD COLUMN "plannedQuantity" DOUBLE PRECISION,
ADD COLUMN "quantityUnit" TEXT NOT NULL DEFAULT 'Adet';
