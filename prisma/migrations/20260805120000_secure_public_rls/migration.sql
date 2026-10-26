-- Supabase Security Advisor: secure public Prisma tables without changing data.
-- This migration keeps the owner-bypass behavior so the server-side Prisma
-- database role can continue to access owned tables.
-- Do not include _prisma_migrations or Supabase system schemas here.

DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY[
    'FranchiseCandidate',
    'Document',
    'Franchisee',
    'Branch',
    'BranchConcept',
    'BranchUser',
    'BranchTask',
    'TaskEvidence',
    'TrainingCategory',
    'TrainingProgram',
    'TrainingModule',
    'TrainingLesson',
    'AcademyMediaAsset',
    'TrainingAssignment',
    'LessonProgress',
    'LearningPath',
    'LearningPathProgram',
    'Quiz',
    'QuizQuestion',
    'QuizOption',
    'QuizAttempt',
    'QuizAttemptAnswer',
    'TrainingCertificate',
    'CorporateDocumentCategory',
    'CorporateDocument',
    'CorporateDocumentVersion',
    'DocumentAcknowledgement',
    'LiveTrainingSession',
    'LiveTrainingAttendance',
    'BranchRevenueRecord',
    'BranchAudit',
    'AuditTemplate',
    'AuditSection',
    'AuditQuestion',
    'AuditQuestionOption',
    'AuditQuestionCondition',
    'AuditAssignment',
    'Audit',
    'AuditAnswer',
    'AuditEvidence',
    'AuditFinding',
    'CorrectiveAction',
    'BranchHealthScoreSnapshot',
    'BranchDevelopmentPlan',
    'OperationCalendarItem',
    'BranchVisit',
    'BranchTimelineEvent',
    'BranchOpening',
    'OpeningStage',
    'OpeningTask',
    'OpeningProjectTemplate',
    'OpeningStageTemplate',
    'OpeningMilestoneTemplate',
    'OpeningMilestoneDependency',
    'OpeningTaskTemplate',
    'OpeningProject',
    'OpeningProjectStage',
    'OpeningMilestone',
    'OpeningBudgetItem',
    'OpeningRisk',
    'OpeningTargetDateChange',
    'OpeningReadinessCheck',
    'OpeningPostOpeningReview',
    'CandidateTask',
    'CandidateInteraction',
    'Lead',
    'LeadActivity',
    'LeadAppointment',
    'LeadTask',
    'Concept',
    'CandidateConcept',
    'LeadConcept',
    'CandidateTag',
    'CandidateTagLink',
    'CandidateTimelineEvent',
    'CandidateLocation',
    'CandidateLocationDocument',
    'LeadCandidateLocation',
    'CandidateLocationMatch',
    'ProductCategory',
    'Product',
    'Warehouse',
    'WarehouseStock',
    'StockMovement',
    'FranchiseOrder',
    'FranchiseOrderItem',
    'OrderActivity',
    'Shipment',
    'Supplier',
    'SupplierProduct',
    'PurchaseRequest',
    'PurchaseRequestItem',
    'PurchaseOrder',
    'PurchaseOrderItem',
    'PurchaseApproval',
    'ExternalProductMapping',
    'ProductMappingQueue',
    'ExternalBranchMapping',
    'InventoryLot',
    'GoodsReceipt',
    'GoodsReceiptItem',
    'PickingList',
    'PickingListItem',
    'ShipmentItem',
    'ShipmentBackorder',
    'DeliveryIssue',
    'ReturnRequest',
    'ReturnItem',
    'InventoryLoss',
    'StockCount',
    'StockCountItem',
    'SupplyComplianceAlert',
    'BranchFinancialProfile',
    'RoyaltyTier',
    'RoyaltyAccrual',
    'BranchLedgerAccount',
    'BranchLedgerEntry',
    'CollectionPayment',
    'PaymentAllocation',
    'BranchFinancialReconciliation',
    'FinancialDispute',
    'FinancialActivityLog',
    'Notification',
    'User',
    'Role',
    'AuditLog',
    'IntegrationLog',
    'IntegrationConnection',
    'IntegrationEvent',
    'ExternalCustomerMapping',
    'ExternalSupplierMapping',
    'ExternalInvoice',
    'ReconciliationRecord',
    'MetaWebhookLog',
    'WhatsAppMessage'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
      END IF;

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
  END IF;
END $$;
