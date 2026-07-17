CREATE TABLE "BranchFinancialProfile" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "royaltyModel" TEXT NOT NULL DEFAULT 'PERCENTAGE_OF_REVENUE',
  "royaltyRate" DECIMAL(8,4),
  "fixedRoyaltyAmount" DECIMAL(18,2),
  "minimumRoyaltyAmount" DECIMAL(18,2),
  "royaltyCurrency" TEXT NOT NULL DEFAULT 'TRY',
  "royaltyCalculationBase" TEXT NOT NULL DEFAULT 'APPROVED_REVENUE',
  "royaltyPeriod" TEXT NOT NULL DEFAULT 'MONTHLY',
  "royaltyDueDay" INTEGER NOT NULL DEFAULT 15,
  "royaltyGracePeriodDays" INTEGER NOT NULL DEFAULT 0,
  "royaltyStartDate" TIMESTAMP(3),
  "royaltyEndDate" TIMESTAMP(3),
  "royaltyExemptionStartDate" TIMESTAMP(3),
  "royaltyExemptionEndDate" TIMESTAMP(3),
  "advertisingContributionModel" TEXT NOT NULL DEFAULT 'NONE',
  "advertisingContributionRate" DECIMAL(8,4),
  "fixedAdvertisingContribution" DECIMAL(18,2),
  "paymentTermDays" INTEGER NOT NULL DEFAULT 15,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'TRY',
  "lateFeePolicy" TEXT NOT NULL DEFAULT 'NONE',
  "lateFeeRate" DECIMAL(8,4),
  "lateFeeFixedAmount" DECIMAL(18,2),
  "creditLimit" DECIMAL(18,2),
  "riskLimit" DECIMAL(18,2),
  "allowPartialPayment" BOOLEAN NOT NULL DEFAULT true,
  "allowAdvancePayment" BOOLEAN NOT NULL DEFAULT true,
  "invoiceRequired" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "approvedById" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchFinancialProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoyaltyTier" (
  "id" TEXT NOT NULL,
  "financialProfileId" TEXT NOT NULL,
  "minimumRevenue" DECIMAL(18,2) NOT NULL,
  "maximumRevenue" DECIMAL(18,2),
  "royaltyRate" DECIMAL(8,4) NOT NULL,
  "fixedAddition" DECIMAL(18,2),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoyaltyTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoyaltyAccrual" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "financialProfileId" TEXT,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "accrualDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "royaltyModel" TEXT NOT NULL,
  "calculationBase" TEXT NOT NULL DEFAULT 'APPROVED_REVENUE',
  "revenueAmount" DECIMAL(18,2) NOT NULL,
  "royaltyRate" DECIMAL(8,4),
  "fixedAmount" DECIMAL(18,2),
  "minimumAmount" DECIMAL(18,2),
  "calculatedRoyalty" DECIMAL(18,2) NOT NULL,
  "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "additionalFeeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(18,2) NOT NULL,
  "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "outstandingAmount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "exchangeRate" DECIMAL(18,6),
  "status" TEXT NOT NULL DEFAULT 'CALCULATED',
  "sourceRevenueRecordIds" TEXT,
  "calculationSnapshot" TEXT,
  "parasutInvoiceId" TEXT,
  "parasutInvoiceNumber" TEXT,
  "invoiceStatus" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "cancelledById" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoyaltyAccrual_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BranchLedgerAccount" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "creditLimit" DECIMAL(18,2),
  "riskLimit" DECIMAL(18,2),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastMovementAt" TIMESTAMP(3),
  "lastReconciledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchLedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BranchLedgerEntry" (
  "id" TEXT NOT NULL,
  "ledgerAccountId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "entryNumber" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "exchangeRate" DECIMAL(18,6),
  "baseCurrencyAmount" DECIMAL(18,2),
  "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "referenceType" TEXT,
  "referenceId" TEXT,
  "royaltyAccrualId" TEXT,
  "orderId" TEXT,
  "invoiceId" TEXT,
  "paymentId" TEXT,
  "description" TEXT,
  "sourceSystem" TEXT NOT NULL DEFAULT 'ICEBERRY',
  "externalReferenceId" TEXT,
  "performedById" TEXT,
  "approvedById" TEXT,
  "reversedEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionPayment" (
  "id" TEXT NOT NULL,
  "paymentNumber" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "ledgerAccountId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "exchangeRate" DECIMAL(18,6),
  "baseCurrencyAmount" DECIMAL(18,2),
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "valueDate" TIMESTAMP(3),
  "paymentMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  "bankAccountId" TEXT,
  "referenceNumber" TEXT,
  "description" TEXT,
  "sourceSystem" TEXT NOT NULL DEFAULT 'ICEBERRY',
  "externalPaymentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "unappliedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "cancelledById" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollectionPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAllocation" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "royaltyAccrualId" TEXT,
  "invoiceId" TEXT,
  "allocatedAmount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "allocationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BranchFinancialReconciliation" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "ledgerAccountId" TEXT,
  "provider" TEXT,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "internalBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "externalBalance" DECIMAL(18,2),
  "differenceAmount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "discrepancyDetails" TEXT,
  "resolution" TEXT,
  "resolutionNote" TEXT,
  "sentAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "disputedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BranchFinancialReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialDispute" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "royaltyAccrualId" TEXT,
  "ledgerEntryId" TEXT,
  "invoiceId" TEXT,
  "disputeType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdById" TEXT,
  "assignedUserId" TEXT,
  "resolution" TEXT,
  "resolutionNote" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialDispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialActivityLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "branchId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "action" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "amount" DECIMAL(18,2),
  "currency" TEXT,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BranchFinancialProfile_branchId_key" ON "BranchFinancialProfile"("branchId");
CREATE INDEX "BranchFinancialProfile_status_isActive_idx" ON "BranchFinancialProfile"("status", "isActive");
CREATE INDEX "BranchFinancialProfile_royaltyModel_idx" ON "BranchFinancialProfile"("royaltyModel");

CREATE INDEX "RoyaltyTier_financialProfileId_isActive_sortOrder_idx" ON "RoyaltyTier"("financialProfileId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "RoyaltyAccrual_branchId_periodStart_periodEnd_royaltyModel_key" ON "RoyaltyAccrual"("branchId", "periodStart", "periodEnd", "royaltyModel");
CREATE INDEX "RoyaltyAccrual_branchId_status_idx" ON "RoyaltyAccrual"("branchId", "status");
CREATE INDEX "RoyaltyAccrual_periodStart_periodEnd_idx" ON "RoyaltyAccrual"("periodStart", "periodEnd");
CREATE INDEX "RoyaltyAccrual_dueDate_status_idx" ON "RoyaltyAccrual"("dueDate", "status");

CREATE UNIQUE INDEX "BranchLedgerAccount_accountNumber_key" ON "BranchLedgerAccount"("accountNumber");
CREATE UNIQUE INDEX "BranchLedgerAccount_branchId_currency_key" ON "BranchLedgerAccount"("branchId", "currency");
CREATE INDEX "BranchLedgerAccount_branchId_status_idx" ON "BranchLedgerAccount"("branchId", "status");
CREATE INDEX "BranchLedgerAccount_currency_idx" ON "BranchLedgerAccount"("currency");

CREATE UNIQUE INDEX "BranchLedgerEntry_entryNumber_key" ON "BranchLedgerEntry"("entryNumber");
CREATE UNIQUE INDEX "BranchLedgerEntry_sourceSystem_referenceType_referenceId_entryType_key" ON "BranchLedgerEntry"("sourceSystem", "referenceType", "referenceId", "entryType");
CREATE INDEX "BranchLedgerEntry_ledgerAccountId_transactionDate_idx" ON "BranchLedgerEntry"("ledgerAccountId", "transactionDate");
CREATE INDEX "BranchLedgerEntry_branchId_status_idx" ON "BranchLedgerEntry"("branchId", "status");
CREATE INDEX "BranchLedgerEntry_dueDate_status_idx" ON "BranchLedgerEntry"("dueDate", "status");
CREATE INDEX "BranchLedgerEntry_royaltyAccrualId_idx" ON "BranchLedgerEntry"("royaltyAccrualId");
CREATE INDEX "BranchLedgerEntry_orderId_idx" ON "BranchLedgerEntry"("orderId");
CREATE INDEX "BranchLedgerEntry_invoiceId_idx" ON "BranchLedgerEntry"("invoiceId");
CREATE INDEX "BranchLedgerEntry_externalReferenceId_idx" ON "BranchLedgerEntry"("externalReferenceId");

CREATE UNIQUE INDEX "CollectionPayment_paymentNumber_key" ON "CollectionPayment"("paymentNumber");
CREATE UNIQUE INDEX "CollectionPayment_sourceSystem_externalPaymentId_key" ON "CollectionPayment"("sourceSystem", "externalPaymentId");
CREATE INDEX "CollectionPayment_branchId_status_idx" ON "CollectionPayment"("branchId", "status");
CREATE INDEX "CollectionPayment_ledgerAccountId_paymentDate_idx" ON "CollectionPayment"("ledgerAccountId", "paymentDate");
CREATE INDEX "CollectionPayment_valueDate_idx" ON "CollectionPayment"("valueDate");

CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");
CREATE INDEX "PaymentAllocation_ledgerEntryId_idx" ON "PaymentAllocation"("ledgerEntryId");
CREATE INDEX "PaymentAllocation_royaltyAccrualId_idx" ON "PaymentAllocation"("royaltyAccrualId");

CREATE INDEX "BranchFinancialReconciliation_branchId_status_idx" ON "BranchFinancialReconciliation"("branchId", "status");
CREATE INDEX "BranchFinancialReconciliation_periodStart_periodEnd_idx" ON "BranchFinancialReconciliation"("periodStart", "periodEnd");
CREATE INDEX "BranchFinancialReconciliation_provider_status_idx" ON "BranchFinancialReconciliation"("provider", "status");

CREATE INDEX "FinancialDispute_branchId_status_idx" ON "FinancialDispute"("branchId", "status");
CREATE INDEX "FinancialDispute_royaltyAccrualId_idx" ON "FinancialDispute"("royaltyAccrualId");
CREATE INDEX "FinancialDispute_ledgerEntryId_idx" ON "FinancialDispute"("ledgerEntryId");
CREATE INDEX "FinancialDispute_invoiceId_idx" ON "FinancialDispute"("invoiceId");
CREATE INDEX "FinancialDispute_assignedUserId_status_idx" ON "FinancialDispute"("assignedUserId", "status");

CREATE INDEX "FinancialActivityLog_userId_createdAt_idx" ON "FinancialActivityLog"("userId", "createdAt");
CREATE INDEX "FinancialActivityLog_branchId_createdAt_idx" ON "FinancialActivityLog"("branchId", "createdAt");
CREATE INDEX "FinancialActivityLog_entityType_entityId_idx" ON "FinancialActivityLog"("entityType", "entityId");
CREATE INDEX "FinancialActivityLog_action_createdAt_idx" ON "FinancialActivityLog"("action", "createdAt");

ALTER TABLE "BranchFinancialProfile" ADD CONSTRAINT "BranchFinancialProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTier" ADD CONSTRAINT "RoyaltyTier_financialProfileId_fkey" FOREIGN KEY ("financialProfileId") REFERENCES "BranchFinancialProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyAccrual" ADD CONSTRAINT "RoyaltyAccrual_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyAccrual" ADD CONSTRAINT "RoyaltyAccrual_financialProfileId_fkey" FOREIGN KEY ("financialProfileId") REFERENCES "BranchFinancialProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchLedgerAccount" ADD CONSTRAINT "BranchLedgerAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BranchLedgerEntry" ADD CONSTRAINT "BranchLedgerEntry_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "BranchLedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BranchLedgerEntry" ADD CONSTRAINT "BranchLedgerEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BranchLedgerEntry" ADD CONSTRAINT "BranchLedgerEntry_royaltyAccrualId_fkey" FOREIGN KEY ("royaltyAccrualId") REFERENCES "RoyaltyAccrual"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchLedgerEntry" ADD CONSTRAINT "BranchLedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CollectionPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollectionPayment" ADD CONSTRAINT "CollectionPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollectionPayment" ADD CONSTRAINT "CollectionPayment_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "BranchLedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CollectionPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "BranchLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_royaltyAccrualId_fkey" FOREIGN KEY ("royaltyAccrualId") REFERENCES "RoyaltyAccrual"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchFinancialReconciliation" ADD CONSTRAINT "BranchFinancialReconciliation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialDispute" ADD CONSTRAINT "FinancialDispute_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialDispute" ADD CONSTRAINT "FinancialDispute_royaltyAccrualId_fkey" FOREIGN KEY ("royaltyAccrualId") REFERENCES "RoyaltyAccrual"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialActivityLog" ADD CONSTRAINT "FinancialActivityLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
