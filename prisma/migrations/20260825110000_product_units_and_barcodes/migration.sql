-- CreateTable
CREATE TABLE "public"."ProductUnit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isPurchaseDefault" BOOLEAN NOT NULL DEFAULT false,
    "isShipmentDefault" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductBarcode" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productUnitId" TEXT,
    "barcode" TEXT NOT NULL,
    "barcodeType" TEXT NOT NULL DEFAULT 'UNIT',
    "unitName" TEXT NOT NULL DEFAULT 'Adet',
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'INTERNAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_productId_code_key" ON "public"."ProductUnit"("productId", "code");

-- CreateIndex
CREATE INDEX "ProductUnit_productId_isBase_idx" ON "public"."ProductUnit"("productId", "isBase");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcode_barcode_key" ON "public"."ProductBarcode"("barcode");

-- CreateIndex
CREATE INDEX "ProductBarcode_productId_isActive_idx" ON "public"."ProductBarcode"("productId", "isActive");

-- CreateIndex
CREATE INDEX "ProductBarcode_productUnitId_idx" ON "public"."ProductBarcode"("productUnitId");

-- CreateIndex
CREATE INDEX "ProductBarcode_barcodeType_idx" ON "public"."ProductBarcode"("barcodeType");

-- AddForeignKey
ALTER TABLE "public"."ProductUnit" ADD CONSTRAINT "ProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductBarcode" ADD CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductBarcode" ADD CONSTRAINT "ProductBarcode_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "public"."ProductUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
