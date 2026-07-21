ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "parentCategoryId" TEXT;
ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCategory_code_key" ON "ProductCategory"("code");
CREATE INDEX IF NOT EXISTS "ProductCategory_parentCategoryId_idx" ON "ProductCategory"("parentCategoryId");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shortName" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packageQuantity" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packageUnit" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "baseUnit" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "minimumOrderQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "orderIncrement" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "trackInventory" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "trackLot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "trackExpiration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shelfLifeDays" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "storageCondition" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isOrderable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "centralSupplyPolicy" TEXT NOT NULL DEFAULT 'PREFERRED_CENTRAL';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ticimaxProductId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
CREATE INDEX IF NOT EXISTS "Product_centralSupplyPolicy_idx" ON "Product"("centralSupplyPolicy");
CREATE INDEX IF NOT EXISTS "Product_isOrderable_isActive_idx" ON "Product"("isOrderable", "isActive");

ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'CENTRAL';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'Türkiye';
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "managerUserId" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_code_key" ON "Warehouse"("code");
CREATE INDEX IF NOT EXISTS "Warehouse_type_status_idx" ON "Warehouse"("type", "status");

ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "minimumStockLevel" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "reorderPoint" DOUBLE PRECISION;
ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "maximumStockLevel" DOUBLE PRECISION;
ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "averageCost" DOUBLE PRECISION;
ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "lastPurchasePrice" DOUBLE PRECISION;
ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "lastMovementAt" TIMESTAMP(3);
ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "lastCountedAt" TIMESTAMP(3);
ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WarehouseStock" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "WarehouseStock_warehouseId_updatedAt_idx" ON "WarehouseStock"("warehouseId", "updatedAt");

ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "lotId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "unitCost" DOUBLE PRECISION;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "previousQuantity" DOUBLE PRECISION;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "newQuantity" DOUBLE PRECISION;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "reasonCode" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "documentId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "performedById" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "StockMovement_lotId_idx" ON "StockMovement"("lotId");
CREATE INDEX IF NOT EXISTS "StockMovement_movementType_occurredAt_idx" ON "StockMovement"("movementType", "occurredAt");

ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL_OTHER';
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "orderType" TEXT NOT NULL DEFAULT 'FRANCHISE_SALE';
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "externalOrderId" TEXT;
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "ticimaxOrderNumber" TEXT;
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "reservedAt" TIMESTAMP(3);
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "pickingStartedAt" TIMESTAMP(3);
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "packedAt" TIMESTAMP(3);
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "readyToShipAt" TIMESTAMP(3);
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP(3);
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "FranchiseOrder_source_externalOrderId_key" ON "FranchiseOrder"("source", "externalOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "FranchiseOrder_ticimaxOrderNumber_key" ON "FranchiseOrder"("ticimaxOrderNumber");
CREATE INDEX IF NOT EXISTS "FranchiseOrder_source_createdAt_idx" ON "FranchiseOrder"("source", "createdAt");
CREATE INDEX IF NOT EXISTS "FranchiseOrder_orderType_createdAt_idx" ON "FranchiseOrder"("orderType", "createdAt");

ALTER TABLE "FranchiseOrderItem" ADD COLUMN IF NOT EXISTS "approvedQuantity" DOUBLE PRECISION;
ALTER TABLE "FranchiseOrderItem" ADD COLUMN IF NOT EXISTS "reservedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FranchiseOrderItem" ADD COLUMN IF NOT EXISTS "pickedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FranchiseOrderItem" ADD COLUMN IF NOT EXISTS "packedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FranchiseOrderItem" ADD COLUMN IF NOT EXISTS "shippedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FranchiseOrderItem" ADD COLUMN IF NOT EXISTS "deliveredQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FranchiseOrderItem" ADD COLUMN IF NOT EXISTS "returnedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "FranchiseOrderItem" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "shipmentType" TEXT NOT NULL DEFAULT 'CARGO';
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "driverName" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "driverPhone" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "deliveredById" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "receivedByName" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "deliveryProblemStatus" TEXT;
CREATE INDEX IF NOT EXISTS "Shipment_status_shippedAt_idx" ON "Shipment"("status", "shippedAt");

CREATE TABLE IF NOT EXISTS "Supplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "taxNumber" TEXT,
  "taxOffice" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_code_key" ON "Supplier"("code");
CREATE INDEX IF NOT EXISTS "Supplier_name_idx" ON "Supplier"("name");
CREATE INDEX IF NOT EXISTS "Supplier_status_idx" ON "Supplier"("status");

CREATE TABLE IF NOT EXISTS "ExternalProductMapping" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "externalProductId" TEXT NOT NULL,
  "externalSku" TEXT,
  "externalBarcode" TEXT,
  "externalName" TEXT NOT NULL,
  "supplierId" TEXT,
  "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "externalUnit" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastMatchedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalProductMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalProductMapping_sourceSystem_externalProductId_isActive_key" ON "ExternalProductMapping"("sourceSystem", "externalProductId", "isActive");
CREATE INDEX IF NOT EXISTS "ExternalProductMapping_productId_sourceSystem_idx" ON "ExternalProductMapping"("productId", "sourceSystem");

CREATE TABLE IF NOT EXISTS "ProductMappingQueue" (
  "id" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "externalProductId" TEXT,
  "externalName" TEXT NOT NULL,
  "externalSku" TEXT,
  "externalBarcode" TEXT,
  "externalUnit" TEXT,
  "sourceDocumentId" TEXT,
  "sourceOrderId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "suggestedProductId" TEXT,
  "matchedProductId" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductMappingQueue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProductMappingQueue_sourceSystem_status_idx" ON "ProductMappingQueue"("sourceSystem", "status");

CREATE TABLE IF NOT EXISTS "ExternalBranchMapping" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "externalCustomerId" TEXT,
  "externalStoreId" TEXT,
  "externalCode" TEXT,
  "externalName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalBranchMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalBranchMapping_sourceSystem_externalCustomerId_key" ON "ExternalBranchMapping"("sourceSystem", "externalCustomerId");
CREATE INDEX IF NOT EXISTS "ExternalBranchMapping_branchId_sourceSystem_idx" ON "ExternalBranchMapping"("branchId", "sourceSystem");

CREATE TABLE IF NOT EXISTS "InventoryLot" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "lotNumber" TEXT NOT NULL,
  "productionDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "quantityOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantityReserved" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "supplierId" TEXT,
  "goodsReceiptItemId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryLot_warehouseId_productId_lotNumber_key" ON "InventoryLot"("warehouseId", "productId", "lotNumber");
CREATE INDEX IF NOT EXISTS "InventoryLot_expirationDate_status_idx" ON "InventoryLot"("expirationDate", "status");

CREATE TABLE IF NOT EXISTS "GoodsReceipt" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "supplierId" TEXT,
  "sourceSystem" TEXT NOT NULL DEFAULT 'MANUAL',
  "externalDocumentId" TEXT,
  "invoiceNumber" TEXT,
  "invoiceDate" TIMESTAMP(3),
  "deliveryDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING_RECEIPT',
  "totalExpectedItems" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalReceivedItems" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discrepancyStatus" TEXT NOT NULL DEFAULT 'NONE',
  "receivedById" TEXT,
  "approvedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GoodsReceipt_warehouseId_status_idx" ON "GoodsReceipt"("warehouseId", "status");

CREATE TABLE IF NOT EXISTS "GoodsReceiptItem" (
  "id" TEXT NOT NULL,
  "goodsReceiptId" TEXT NOT NULL,
  "productId" TEXT,
  "externalProductId" TEXT,
  "expectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "acceptedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "damagedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "missingQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "excessQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL,
  "unitCost" DOUBLE PRECISION,
  "lotNumber" TEXT,
  "productionDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "discrepancyReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GoodsReceiptItem_goodsReceiptId_idx" ON "GoodsReceiptItem"("goodsReceiptId");

CREATE TABLE IF NOT EXISTS "PickingList" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assignedUserId" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PickingList_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PickingList_warehouseId_status_idx" ON "PickingList"("warehouseId", "status");

CREATE TABLE IF NOT EXISTS "PickingListItem" (
  "id" TEXT NOT NULL,
  "pickingListId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "lotId" TEXT,
  "requestedQuantity" DOUBLE PRECISION NOT NULL,
  "pickedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "missingQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PickingListItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ShipmentItem" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "lotId" TEXT,
  "packedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shippedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deliveredQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "damagedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "missingQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShipmentItem_shipmentId_orderItemId_key" ON "ShipmentItem"("shipmentId", "orderItemId");

CREATE TABLE IF NOT EXISTS "DeliveryIssue" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "shipmentId" TEXT,
  "branchId" TEXT,
  "issueType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'ATTENTION',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "description" TEXT NOT NULL,
  "reportedById" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReturnRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "requestedById" TEXT,
  "approvedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReturnItem" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "acceptedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quarantinedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "damagedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InventoryLoss" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "lossType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "estimatedCost" DOUBLE PRECISION,
  "reason" TEXT,
  "notes" TEXT,
  "reportedById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryLoss_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StockCount" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "countType" TEXT NOT NULL DEFAULT 'FULL',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "assignedUserId" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StockCountItem" (
  "id" TEXT NOT NULL,
  "stockCountId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "expectedQuantity" DOUBLE PRECISION NOT NULL,
  "countedQuantity" DOUBLE PRECISION,
  "differenceQuantity" DOUBLE PRECISION,
  "reasonCode" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCountItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StockCountItem_stockCountId_productId_key" ON "StockCountItem"("stockCountId", "productId");

CREATE TABLE IF NOT EXISTS "SupplyComplianceAlert" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "productId" TEXT,
  "warehouseId" TEXT,
  "orderId" TEXT,
  "alertType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
  "assignedTaskId" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplyComplianceAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupplyComplianceAlert_branchId_status_idx" ON "SupplyComplianceAlert"("branchId", "status");
CREATE INDEX IF NOT EXISTS "SupplyComplianceAlert_severity_status_idx" ON "SupplyComplianceAlert"("severity", "status");

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "role" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'UNREAD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_status_idx" ON "Notification"("userId", "status");
CREATE INDEX IF NOT EXISTS "Notification_role_status_idx" ON "Notification"("role", "status");

INSERT INTO "ProductCategory" ("id", "name", "code", "description", "sortOrder", "orderIndex", "isActive", "createdAt", "updatedAt")
VALUES
  ('cat_frozen_yogurt', 'Frozen Yoğurt Hammaddeleri', 'FROZEN_YOGURT', 'Başlangıç kategori', 10, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_bubble_tea', 'Bubble Tea Ürünleri', 'BUBBLE_TEA', 'Başlangıç kategori', 20, 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_bubble_waffle', 'Bubble Waffle Ürünleri', 'BUBBLE_WAFFLE', 'Başlangıç kategori', 30, 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_sauces', 'Soslar', 'SAUCES', 'Başlangıç kategori', 40, 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_toppings', 'Toppingler', 'TOPPINGS', 'Başlangıç kategori', 50, 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_packaging', 'Ambalaj', 'PACKAGING', 'Başlangıç kategori', 90, 90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_cleaning', 'Temizlik Ürünleri', 'CLEANING', 'Başlangıç kategori', 100, 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_equipment', 'Makine ve Ekipman', 'EQUIPMENT', 'Başlangıç kategori', 120, 120, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat_other', 'Diğer', 'OTHER', 'Başlangıç kategori', 999, 999, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
