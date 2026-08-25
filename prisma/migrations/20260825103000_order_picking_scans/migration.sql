-- CreateTable
CREATE TABLE "public"."OrderPickingScan" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "barcode" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "scannedById" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanType" TEXT NOT NULL DEFAULT 'BARCODE_SCAN',
    "note" TEXT,

    CONSTRAINT "OrderPickingScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderPickingScan_orderId_scannedAt_idx" ON "public"."OrderPickingScan"("orderId", "scannedAt");

-- CreateIndex
CREATE INDEX "OrderPickingScan_orderItemId_scannedAt_idx" ON "public"."OrderPickingScan"("orderItemId", "scannedAt");

-- CreateIndex
CREATE INDEX "OrderPickingScan_productId_scannedAt_idx" ON "public"."OrderPickingScan"("productId", "scannedAt");

-- CreateIndex
CREATE INDEX "OrderPickingScan_barcode_idx" ON "public"."OrderPickingScan"("barcode");

-- CreateIndex
CREATE INDEX "OrderPickingScan_scanType_scannedAt_idx" ON "public"."OrderPickingScan"("scanType", "scannedAt");

-- AddForeignKey
ALTER TABLE "public"."OrderPickingScan" ADD CONSTRAINT "OrderPickingScan_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."FranchiseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPickingScan" ADD CONSTRAINT "OrderPickingScan_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."FranchiseOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPickingScan" ADD CONSTRAINT "OrderPickingScan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
