DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningProjectStatus') THEN
    CREATE TYPE "OpeningProjectStatus" AS ENUM ('DRAFT','PLANNING','IN_PROGRESS','ON_HOLD','AT_RISK','DELAYED','READY_FOR_REVIEW','READY_FOR_OPENING','OPENED','POST_OPENING','COMPLETED','CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningTemplateStatus') THEN
    CREATE TYPE "OpeningTemplateStatus" AS ENUM ('DRAFT','REVIEW','APPROVED','PUBLISHED','ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningStageStatus') THEN
    CREATE TYPE "OpeningStageStatus" AS ENUM ('NOT_STARTED','READY_TO_START','IN_PROGRESS','BLOCKED','AT_RISK','DELAYED','COMPLETED','SKIPPED','CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningMilestoneStatus') THEN
    CREATE TYPE "OpeningMilestoneStatus" AS ENUM ('PENDING','READY_TO_START','IN_PROGRESS','WAITING_APPROVAL','WAITING_CORRECTION','COMPLETED','BLOCKED','DELAYED','SKIPPED','CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningPriority') THEN
    CREATE TYPE "OpeningPriority" AS ENUM ('LOW','NORMAL','HIGH','URGENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningRiskLevel') THEN
    CREATE TYPE "OpeningRiskLevel" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningRiskStatus') THEN
    CREATE TYPE "OpeningRiskStatus" AS ENUM ('OPEN','WATCHING','MITIGATED','RESOLVED','CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningBudgetStatus') THEN
    CREATE TYPE "OpeningBudgetStatus" AS ENUM ('PLANNED','APPROVED','SPENT','OVER_BUDGET','CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpeningDependencyType') THEN
    CREATE TYPE "OpeningDependencyType" AS ENUM ('FINISH_TO_START','START_TO_START','FINISH_TO_FINISH');
  END IF;
END $$;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "openingProjectId" TEXT;
ALTER TABLE "BranchTask" ADD COLUMN IF NOT EXISTS "openingProjectId" TEXT;
ALTER TABLE "BranchTask" ADD COLUMN IF NOT EXISTS "openingStageId" TEXT;
ALTER TABLE "BranchTask" ADD COLUMN IF NOT EXISTS "openingMilestoneId" TEXT;

CREATE TABLE IF NOT EXISTS "OpeningProjectTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "OpeningTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "branchConcept" TEXT,
  "ownershipType" TEXT,
  "country" TEXT NOT NULL DEFAULT 'Türkiye',
  "estimatedDurationDays" INTEGER NOT NULL DEFAULT 90,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'TRY',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdById" TEXT,
  "approvedById" TEXT,
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningProjectTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningStageTemplate" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "estimatedDurationDays" INTEGER NOT NULL DEFAULT 7,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningStageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningMilestoneTemplate" (
  "id" TEXT NOT NULL,
  "stageTemplateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "estimatedDurationDays" INTEGER NOT NULL DEFAULT 3,
  "defaultOwnerRole" TEXT,
  "priority" "OpeningPriority" NOT NULL DEFAULT 'NORMAL',
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
  "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
  "requiresAudit" BOOLEAN NOT NULL DEFAULT false,
  "auditType" TEXT,
  "completionRule" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningMilestoneTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningMilestoneDependency" (
  "id" TEXT NOT NULL,
  "predecessorMilestoneTemplateId" TEXT NOT NULL,
  "successorMilestoneTemplateId" TEXT NOT NULL,
  "dependencyType" "OpeningDependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
  "lagDays" INTEGER NOT NULL DEFAULT 0,
  "isBlocking" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningMilestoneDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningTaskTemplate" (
  "id" TEXT NOT NULL,
  "milestoneTemplateId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" "OpeningPriority" NOT NULL DEFAULT 'NORMAL',
  "defaultOwnerRole" TEXT,
  "dueOffsetDays" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
  "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
  "autoCreate" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningTaskTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningProject" (
  "id" TEXT NOT NULL,
  "projectNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "franchiseCandidateId" TEXT,
  "contractId" TEXT,
  "locationAnalysisId" TEXT,
  "candidateLocationId" TEXT,
  "templateId" TEXT,
  "templateVersion" INTEGER,
  "branchConcept" TEXT,
  "ownershipType" TEXT,
  "country" TEXT NOT NULL DEFAULT 'Türkiye',
  "city" TEXT NOT NULL,
  "district" TEXT,
  "address" TEXT,
  "shoppingMallName" TEXT,
  "investorName" TEXT,
  "investorCompanyName" TEXT,
  "projectManagerId" TEXT,
  "operationManagerId" TEXT,
  "architecturalLeadId" TEXT,
  "openingCoordinatorId" TEXT,
  "plannedStartDate" TIMESTAMP(3),
  "targetOpeningDate" TIMESTAMP(3) NOT NULL,
  "forecastOpeningDate" TIMESTAMP(3),
  "actualOpeningDate" TIMESTAMP(3),
  "status" "OpeningProjectStatus" NOT NULL DEFAULT 'PLANNING',
  "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "riskLevel" "OpeningRiskLevel" NOT NULL DEFAULT 'LOW',
  "openingReadinessScore" INTEGER NOT NULL DEFAULT 0,
  "currentStageId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "plannedBudget" DECIMAL(18,2),
  "approvedBudget" DECIMAL(18,2),
  "actualCost" DECIMAL(18,2),
  "budgetVariance" DECIMAL(18,2),
  "description" TEXT,
  "cancellationReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "OpeningProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningProjectStage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "stageTemplateId" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "codeSnapshot" TEXT NOT NULL,
  "descriptionSnapshot" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "plannedStartDate" TIMESTAMP(3),
  "plannedEndDate" TIMESTAMP(3),
  "actualStartDate" TIMESTAMP(3),
  "actualEndDate" TIMESTAMP(3),
  "status" "OpeningStageStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "ownerUserId" TEXT,
  "delayDays" INTEGER NOT NULL DEFAULT 0,
  "delayReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningProjectStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningMilestone" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "projectStageId" TEXT NOT NULL,
  "milestoneTemplateId" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "codeSnapshot" TEXT NOT NULL,
  "descriptionSnapshot" TEXT,
  "status" "OpeningMilestoneStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "OpeningPriority" NOT NULL DEFAULT 'NORMAL',
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "plannedStartDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "actualStartDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "assignedUserId" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "delayDays" INTEGER NOT NULL DEFAULT 0,
  "delayReason" TEXT,
  "completionNote" TEXT,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
  "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
  "requiresAudit" BOOLEAN NOT NULL DEFAULT false,
  "relatedAuditId" TEXT,
  "relatedTaskId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningBudgetItem" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "plannedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "approvedAmount" DECIMAL(18,2),
  "actualAmount" DECIMAL(18,2),
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "status" "OpeningBudgetStatus" NOT NULL DEFAULT 'PLANNED',
  "invoiceId" TEXT,
  "documentId" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningBudgetItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningRisk" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "level" "OpeningRiskLevel" NOT NULL DEFAULT 'MEDIUM',
  "status" "OpeningRiskStatus" NOT NULL DEFAULT 'OPEN',
  "probability" INTEGER NOT NULL DEFAULT 50,
  "impact" INTEGER NOT NULL DEFAULT 50,
  "mitigationPlan" TEXT,
  "ownerUserId" TEXT,
  "dueDate" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningRisk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningTargetDateChange" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "oldDate" TIMESTAMP(3) NOT NULL,
  "newDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "changedById" TEXT,
  "affectedSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningTargetDateChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningReadinessCheck" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "component" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "score" INTEGER NOT NULL DEFAULT 0,
  "blocker" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "checkedById" TEXT,
  "checkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningReadinessCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpeningPostOpeningReview" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "plannedDate" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "revenueAmount" DECIMAL(18,2),
  "healthScore" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningPostOpeningReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpeningProjectTemplate_code_version_key" ON "OpeningProjectTemplate"("code", "version");
CREATE INDEX IF NOT EXISTS "OpeningProjectTemplate_status_branchConcept_ownershipType_idx" ON "OpeningProjectTemplate"("status", "branchConcept", "ownershipType");
CREATE INDEX IF NOT EXISTS "OpeningProjectTemplate_isDefault_idx" ON "OpeningProjectTemplate"("isDefault");
CREATE UNIQUE INDEX IF NOT EXISTS "OpeningStageTemplate_templateId_code_key" ON "OpeningStageTemplate"("templateId", "code");
CREATE INDEX IF NOT EXISTS "OpeningStageTemplate_templateId_sortOrder_idx" ON "OpeningStageTemplate"("templateId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "OpeningMilestoneTemplate_stageTemplateId_code_key" ON "OpeningMilestoneTemplate"("stageTemplateId", "code");
CREATE INDEX IF NOT EXISTS "OpeningMilestoneTemplate_stageTemplateId_sortOrder_idx" ON "OpeningMilestoneTemplate"("stageTemplateId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "OpeningMilestoneDependency_predecessorMilestoneTemplateId_successorMilestoneTemplateId_key" ON "OpeningMilestoneDependency"("predecessorMilestoneTemplateId", "successorMilestoneTemplateId");
CREATE INDEX IF NOT EXISTS "OpeningTaskTemplate_milestoneTemplateId_sortOrder_idx" ON "OpeningTaskTemplate"("milestoneTemplateId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "OpeningProject_projectNumber_key" ON "OpeningProject"("projectNumber");
CREATE INDEX IF NOT EXISTS "OpeningProject_branchId_status_idx" ON "OpeningProject"("branchId", "status");
CREATE INDEX IF NOT EXISTS "OpeningProject_franchiseCandidateId_idx" ON "OpeningProject"("franchiseCandidateId");
CREATE INDEX IF NOT EXISTS "OpeningProject_candidateLocationId_idx" ON "OpeningProject"("candidateLocationId");
CREATE INDEX IF NOT EXISTS "OpeningProject_targetOpeningDate_status_idx" ON "OpeningProject"("targetOpeningDate", "status");
CREATE INDEX IF NOT EXISTS "OpeningProject_riskLevel_status_idx" ON "OpeningProject"("riskLevel", "status");
CREATE INDEX IF NOT EXISTS "OpeningProject_archivedAt_idx" ON "OpeningProject"("archivedAt");
CREATE INDEX IF NOT EXISTS "OpeningProjectStage_projectId_sortOrder_idx" ON "OpeningProjectStage"("projectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "OpeningProjectStage_status_plannedEndDate_idx" ON "OpeningProjectStage"("status", "plannedEndDate");
CREATE INDEX IF NOT EXISTS "OpeningMilestone_projectId_status_idx" ON "OpeningMilestone"("projectId", "status");
CREATE INDEX IF NOT EXISTS "OpeningMilestone_projectStageId_status_idx" ON "OpeningMilestone"("projectStageId", "status");
CREATE INDEX IF NOT EXISTS "OpeningMilestone_dueDate_status_idx" ON "OpeningMilestone"("dueDate", "status");
CREATE INDEX IF NOT EXISTS "OpeningMilestone_relatedTaskId_idx" ON "OpeningMilestone"("relatedTaskId");
CREATE INDEX IF NOT EXISTS "OpeningBudgetItem_projectId_category_idx" ON "OpeningBudgetItem"("projectId", "category");
CREATE INDEX IF NOT EXISTS "OpeningBudgetItem_status_idx" ON "OpeningBudgetItem"("status");
CREATE INDEX IF NOT EXISTS "OpeningRisk_projectId_status_idx" ON "OpeningRisk"("projectId", "status");
CREATE INDEX IF NOT EXISTS "OpeningRisk_level_status_idx" ON "OpeningRisk"("level", "status");
CREATE INDEX IF NOT EXISTS "OpeningTargetDateChange_projectId_createdAt_idx" ON "OpeningTargetDateChange"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "OpeningReadinessCheck_projectId_component_idx" ON "OpeningReadinessCheck"("projectId", "component");
CREATE INDEX IF NOT EXISTS "OpeningReadinessCheck_status_blocker_idx" ON "OpeningReadinessCheck"("status", "blocker");
CREATE UNIQUE INDEX IF NOT EXISTS "OpeningPostOpeningReview_projectId_dayNumber_key" ON "OpeningPostOpeningReview"("projectId", "dayNumber");
CREATE INDEX IF NOT EXISTS "OpeningPostOpeningReview_status_plannedDate_idx" ON "OpeningPostOpeningReview"("status", "plannedDate");
CREATE INDEX IF NOT EXISTS "Document_openingProjectId_idx" ON "Document"("openingProjectId");
CREATE INDEX IF NOT EXISTS "BranchTask_openingProjectId_idx" ON "BranchTask"("openingProjectId");
CREATE INDEX IF NOT EXISTS "BranchTask_openingStageId_idx" ON "BranchTask"("openingStageId");
CREATE INDEX IF NOT EXISTS "BranchTask_openingMilestoneId_idx" ON "BranchTask"("openingMilestoneId");
