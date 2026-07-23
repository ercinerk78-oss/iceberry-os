CREATE TABLE IF NOT EXISTS "SupplierProduct" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "supplierSku" TEXT,
  "supplierProductName" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "unitPrice" DECIMAL(18,2),
  "minimumOrderQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "orderIncrement" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "leadTimeDays" INTEGER,
  "paymentTermDays" INTEGER,
  "isPreferred" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastQuotedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupplierProduct_supplierId_productId_key" ON "SupplierProduct"("supplierId", "productId");
CREATE INDEX IF NOT EXISTS "SupplierProduct_productId_isActive_idx" ON "SupplierProduct"("productId", "isActive");
CREATE INDEX IF NOT EXISTS "SupplierProduct_supplierId_isPreferred_idx" ON "SupplierProduct"("supplierId", "isPreferred");

CREATE TABLE IF NOT EXISTS "PurchaseRequest" (
  "id" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "supplierId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "requestedById" TEXT,
  "neededByDate" TIMESTAMP(3),
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseRequest_requestNumber_key" ON "PurchaseRequest"("requestNumber");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_warehouseId_status_idx" ON "PurchaseRequest"("warehouseId", "status");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_supplierId_status_idx" ON "PurchaseRequest"("supplierId", "status");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_status_createdAt_idx" ON "PurchaseRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PurchaseRequest_neededByDate_status_idx" ON "PurchaseRequest"("neededByDate", "status");

CREATE TABLE IF NOT EXISTS "PurchaseRequestItem" (
  "id" TEXT NOT NULL,
  "purchaseRequestId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "requestedQuantity" DOUBLE PRECISION NOT NULL,
  "approvedQuantity" DOUBLE PRECISION,
  "estimatedUnitCost" DECIMAL(18,2),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PurchaseRequestItem_purchaseRequestId_idx" ON "PurchaseRequestItem"("purchaseRequestId");
CREATE INDEX IF NOT EXISTS "PurchaseRequestItem_productId_idx" ON "PurchaseRequestItem"("productId");

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "sourceRequestId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expectedDeliveryDate" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "vatTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "grandTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  "paymentTermDays" INTEGER,
  "externalReference" TEXT,
  "invoiceStatus" TEXT NOT NULL DEFAULT 'NOT_RECEIVED',
  "notes" TEXT,
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_orderNumber_key" ON "PurchaseOrder"("orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_sourceRequestId_key" ON "PurchaseOrder"("sourceRequestId");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_status_idx" ON "PurchaseOrder"("supplierId", "status");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_warehouseId_status_idx" ON "PurchaseOrder"("warehouseId", "status");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_orderDate_idx" ON "PurchaseOrder"("status", "orderDate");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_expectedDeliveryDate_status_idx" ON "PurchaseOrder"("expectedDeliveryDate", "status");

CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "orderedQuantity" DOUBLE PRECISION NOT NULL,
  "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "remainingQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "vatRate" DECIMAL(8,4) NOT NULL DEFAULT 20,
  "discountRate" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "lineSubtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lineDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lineVat" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

CREATE TABLE IF NOT EXISTS "PurchaseApproval" (
  "id" TEXT NOT NULL,
  "purchaseRequestId" TEXT,
  "purchaseOrderId" TEXT,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "comment" TEXT,
  "actedById" TEXT,
  "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PurchaseApproval_purchaseRequestId_actedAt_idx" ON "PurchaseApproval"("purchaseRequestId", "actedAt");
CREATE INDEX IF NOT EXISTS "PurchaseApproval_purchaseOrderId_actedAt_idx" ON "PurchaseApproval"("purchaseOrderId", "actedAt");
CREATE INDEX IF NOT EXISTS "PurchaseApproval_actedById_actedAt_idx" ON "PurchaseApproval"("actedById", "actedAt");

ALTER TABLE "GoodsReceipt" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;
ALTER TABLE "ExternalInvoice" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;
ALTER TABLE "ReconciliationRecord" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;

CREATE INDEX IF NOT EXISTS "GoodsReceipt_purchaseOrderId_idx" ON "GoodsReceipt"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "ExternalInvoice_purchaseOrderId_idx" ON "ExternalInvoice"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_purchaseOrderId_idx" ON "ReconciliationRecord"("purchaseOrderId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierProduct_supplierId_fkey') THEN
    ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierProduct_productId_fkey') THEN
    ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseRequest_warehouseId_fkey') THEN
    ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseRequest_supplierId_fkey') THEN
    ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseRequestItem_purchaseRequestId_fkey') THEN
    ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseRequestItem_productId_fkey') THEN
    ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_supplierId_fkey') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_warehouseId_fkey') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_sourceRequestId_fkey') THEN
    ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_sourceRequestId_fkey" FOREIGN KEY ("sourceRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrderItem_purchaseOrderId_fkey') THEN
    ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrderItem_productId_fkey') THEN
    ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseApproval_purchaseRequestId_fkey') THEN
    ALTER TABLE "PurchaseApproval" ADD CONSTRAINT "PurchaseApproval_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseApproval_purchaseOrderId_fkey') THEN
    ALTER TABLE "PurchaseApproval" ADD CONSTRAINT "PurchaseApproval_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GoodsReceipt_purchaseOrderId_fkey') THEN
    ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExternalInvoice_purchaseOrderId_fkey') THEN
    ALTER TABLE "ExternalInvoice" ADD CONSTRAINT "ExternalInvoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReconciliationRecord_purchaseOrderId_fkey') THEN
    ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
