CREATE TABLE IF NOT EXISTS "ShipmentBackorder" (
  "id" TEXT NOT NULL,
  "franchiseOrderId" TEXT NOT NULL,
  "franchiseOrderItemId" TEXT NOT NULL,
  "shipmentId" TEXT,
  "branchId" TEXT,
  "productId" TEXT NOT NULL,
  "orderedQuantity" DOUBLE PRECISION NOT NULL,
  "shippedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "outstandingQuantity" DOUBLE PRECISION NOT NULL,
  "fulfilledQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reason" TEXT NOT NULL DEFAULT 'STOCK_SHORTAGE',
  "note" TEXT,
  "expectedFulfillmentDate" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "completedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentBackorder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShipmentBackorder_franchiseOrderItemId_key" ON "ShipmentBackorder"("franchiseOrderItemId");
CREATE INDEX IF NOT EXISTS "ShipmentBackorder_franchiseOrderId_status_idx" ON "ShipmentBackorder"("franchiseOrderId", "status");
CREATE INDEX IF NOT EXISTS "ShipmentBackorder_branchId_status_idx" ON "ShipmentBackorder"("branchId", "status");
CREATE INDEX IF NOT EXISTS "ShipmentBackorder_productId_status_idx" ON "ShipmentBackorder"("productId", "status");
CREATE INDEX IF NOT EXISTS "ShipmentBackorder_shipmentId_idx" ON "ShipmentBackorder"("shipmentId");
CREATE INDEX IF NOT EXISTS "ShipmentBackorder_status_expectedFulfillmentDate_idx" ON "ShipmentBackorder"("status", "expectedFulfillmentDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShipmentBackorder_franchiseOrderId_fkey'
  ) THEN
    ALTER TABLE "ShipmentBackorder"
    ADD CONSTRAINT "ShipmentBackorder_franchiseOrderId_fkey"
    FOREIGN KEY ("franchiseOrderId") REFERENCES "FranchiseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShipmentBackorder_franchiseOrderItemId_fkey'
  ) THEN
    ALTER TABLE "ShipmentBackorder"
    ADD CONSTRAINT "ShipmentBackorder_franchiseOrderItemId_fkey"
    FOREIGN KEY ("franchiseOrderItemId") REFERENCES "FranchiseOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShipmentBackorder_shipmentId_fkey'
  ) THEN
    ALTER TABLE "ShipmentBackorder"
    ADD CONSTRAINT "ShipmentBackorder_shipmentId_fkey"
    FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShipmentBackorder_branchId_fkey'
  ) THEN
    ALTER TABLE "ShipmentBackorder"
    ADD CONSTRAINT "ShipmentBackorder_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShipmentBackorder_productId_fkey'
  ) THEN
    ALTER TABLE "ShipmentBackorder"
    ADD CONSTRAINT "ShipmentBackorder_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShipmentBackorder_createdById_fkey'
  ) THEN
    ALTER TABLE "ShipmentBackorder"
    ADD CONSTRAINT "ShipmentBackorder_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShipmentBackorder_completedById_fkey'
  ) THEN
    ALTER TABLE "ShipmentBackorder"
    ADD CONSTRAINT "ShipmentBackorder_completedById_fkey"
    FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
