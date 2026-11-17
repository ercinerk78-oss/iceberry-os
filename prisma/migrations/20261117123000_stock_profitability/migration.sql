ALTER TABLE "StockMovement"
  ADD COLUMN "valuationCurrency" TEXT,
  ADD COLUMN "netSalesAmount" DOUBLE PRECISION;

-- Use the configured product purchase price as an opening estimate, not historical COGS.
UPDATE "WarehouseStock" AS stock
SET "averageCost" = product."purchasePrice"
FROM "Product" AS product
WHERE stock."productId" = product."id"
  AND stock."quantity" > 0
  AND stock."averageCost" IS NULL
  AND product."purchasePrice" > 0;
