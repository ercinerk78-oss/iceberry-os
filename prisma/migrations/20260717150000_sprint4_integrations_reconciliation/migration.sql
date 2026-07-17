ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "invoicedAt" TIMESTAMP(3);
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "invoiceTotal" DECIMAL(18,2);
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "invoiceCurrency" TEXT;
ALTER TABLE "FranchiseOrder" ADD COLUMN IF NOT EXISTS "financialStatus" TEXT NOT NULL DEFAULT 'INVOICE_PENDING';
CREATE INDEX IF NOT EXISTS "FranchiseOrder_financialStatus_createdAt_idx" ON "FranchiseOrder"("financialStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "FranchiseOrder_parasutInvoiceId_idx" ON "FranchiseOrder"("parasutInvoiceId");

CREATE TABLE IF NOT EXISTS "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "accountId" TEXT,
  "companyId" TEXT,
  "storeId" TEXT,
  "encryptedCredentials" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "lastFailedSyncAt" TIMESTAMP(3),
  "lastErrorMessage" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConnection_provider_environment_name_key" ON "IntegrationConnection"("provider", "environment", "name");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_provider_status_idx" ON "IntegrationConnection"("provider", "status");
CREATE INDEX IF NOT EXISTS "IntegrationConnection_isActive_provider_idx" ON "IntegrationConnection"("isActive", "provider");

CREATE TABLE IF NOT EXISTS "IntegrationEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "externalEventId" TEXT,
  "externalEntityId" TEXT,
  "internalEntityType" TEXT,
  "internalEntityId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "requestPayload" TEXT,
  "responsePayload" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationEvent_idempotencyKey_key" ON "IntegrationEvent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "IntegrationEvent_provider_status_createdAt_idx" ON "IntegrationEvent"("provider", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "IntegrationEvent_nextRetryAt_status_idx" ON "IntegrationEvent"("nextRetryAt", "status");
CREATE INDEX IF NOT EXISTS "IntegrationEvent_externalEntityId_idx" ON "IntegrationEvent"("externalEntityId");
CREATE INDEX IF NOT EXISTS "IntegrationEvent_internalEntityType_internalEntityId_idx" ON "IntegrationEvent"("internalEntityType", "internalEntityId");

CREATE TABLE IF NOT EXISTS "ExternalCustomerMapping" (
  "id" TEXT NOT NULL,
  "branchId" TEXT,
  "customerId" TEXT,
  "provider" TEXT NOT NULL,
  "externalCustomerId" TEXT NOT NULL,
  "externalCustomerCode" TEXT,
  "externalName" TEXT NOT NULL,
  "taxNumber" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalCustomerMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalCustomerMapping_provider_externalCustomerId_isActive_key" ON "ExternalCustomerMapping"("provider", "externalCustomerId", "isActive");
CREATE INDEX IF NOT EXISTS "ExternalCustomerMapping_branchId_provider_idx" ON "ExternalCustomerMapping"("branchId", "provider");
CREATE INDEX IF NOT EXISTS "ExternalCustomerMapping_customerId_provider_idx" ON "ExternalCustomerMapping"("customerId", "provider");
CREATE INDEX IF NOT EXISTS "ExternalCustomerMapping_taxNumber_idx" ON "ExternalCustomerMapping"("taxNumber");

CREATE TABLE IF NOT EXISTS "ExternalSupplierMapping" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT,
  "provider" TEXT NOT NULL,
  "externalSupplierId" TEXT NOT NULL,
  "externalSupplierCode" TEXT,
  "externalName" TEXT NOT NULL,
  "taxNumber" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalSupplierMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalSupplierMapping_provider_externalSupplierId_isActive_key" ON "ExternalSupplierMapping"("provider", "externalSupplierId", "isActive");
CREATE INDEX IF NOT EXISTS "ExternalSupplierMapping_supplierId_provider_idx" ON "ExternalSupplierMapping"("supplierId", "provider");
CREATE INDEX IF NOT EXISTS "ExternalSupplierMapping_taxNumber_idx" ON "ExternalSupplierMapping"("taxNumber");

CREATE TABLE IF NOT EXISTS "ExternalInvoice" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "invoiceType" TEXT NOT NULL,
  "externalInvoiceId" TEXT NOT NULL,
  "invoiceNumber" TEXT,
  "externalOrderId" TEXT,
  "orderId" TEXT,
  "goodsReceiptId" TEXT,
  "customerName" TEXT,
  "supplierName" TEXT,
  "invoiceDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "subtotal" DECIMAL(18,2),
  "vatTotal" DECIMAL(18,2),
  "total" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "payload" TEXT,
  "matchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalInvoice_provider_externalInvoiceId_key" ON "ExternalInvoice"("provider", "externalInvoiceId");
CREATE INDEX IF NOT EXISTS "ExternalInvoice_invoiceType_status_idx" ON "ExternalInvoice"("invoiceType", "status");
CREATE INDEX IF NOT EXISTS "ExternalInvoice_orderId_idx" ON "ExternalInvoice"("orderId");
CREATE INDEX IF NOT EXISTS "ExternalInvoice_goodsReceiptId_idx" ON "ExternalInvoice"("goodsReceiptId");
CREATE INDEX IF NOT EXISTS "ExternalInvoice_externalOrderId_idx" ON "ExternalInvoice"("externalOrderId");

CREATE TABLE IF NOT EXISTS "ReconciliationRecord" (
  "id" TEXT NOT NULL,
  "reconciliationType" TEXT NOT NULL,
  "orderId" TEXT,
  "shipmentId" TEXT,
  "goodsReceiptId" TEXT,
  "externalInvoiceId" TEXT,
  "provider" TEXT,
  "status" TEXT NOT NULL,
  "internalAmount" DECIMAL(18,2),
  "externalAmount" DECIMAL(18,2),
  "differenceAmount" DECIMAL(18,2),
  "currency" TEXT,
  "discrepancyDetails" TEXT,
  "assignedUserId" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_reconciliationType_status_idx" ON "ReconciliationRecord"("reconciliationType", "status");
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_orderId_idx" ON "ReconciliationRecord"("orderId");
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_goodsReceiptId_idx" ON "ReconciliationRecord"("goodsReceiptId");
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_externalInvoiceId_idx" ON "ReconciliationRecord"("externalInvoiceId");
CREATE INDEX IF NOT EXISTS "ReconciliationRecord_assignedUserId_status_idx" ON "ReconciliationRecord"("assignedUserId", "status");
