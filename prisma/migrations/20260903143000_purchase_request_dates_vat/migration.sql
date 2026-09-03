-- Satın alma taleplerinde üç tarih ve kalem KDV takibi.
-- Geriye dönük uyumludur: mevcut kayıtlar korunur.
ALTER TABLE "PurchaseRequest"
ADD COLUMN IF NOT EXISTS "orderDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "termDate" TIMESTAMP(3);

ALTER TABLE "PurchaseRequestItem"
ADD COLUMN IF NOT EXISTS "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20;

CREATE INDEX IF NOT EXISTS "PurchaseRequest_termDate_status_idx" ON "PurchaseRequest"("termDate", "status");
