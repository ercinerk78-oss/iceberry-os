CREATE TYPE "OpeningProjectStatus" AS ENUM ('DRAFT','PLANNING','IN_PROGRESS','ON_HOLD','AT_RISK','DELAYED','READY_FOR_REVIEW','READY_FOR_OPENING','OPENED','POST_OPENING','COMPLETED','CANCELLED');
CREATE TYPE "OpeningTemplateStatus" AS ENUM ('DRAFT','REVIEW','APPROVED','PUBLISHED','ARCHIVED');
CREATE TYPE "OpeningStageStatus" AS ENUM ('NOT_STARTED','READY_TO_START','IN_PROGRESS','BLOCKED','AT_RISK','DELAYED','COMPLETED','SKIPPED','CANCELLED');
CREATE TYPE "OpeningMilestoneStatus" AS ENUM ('PENDING','READY_TO_START','IN_PROGRESS','WAITING_APPROVAL','WAITING_CORRECTION','COMPLETED','BLOCKED','DELAYED','SKIPPED','CANCELLED');
CREATE TYPE "OpeningPriority" AS ENUM ('LOW','NORMAL','HIGH','URGENT');
CREATE TYPE "OpeningRiskLevel" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "OpeningRiskStatus" AS ENUM ('OPEN','WATCHING','MITIGATED','RESOLVED','CLOSED');
CREATE TYPE "OpeningBudgetStatus" AS ENUM ('PLANNED','APPROVED','SPENT','OVER_BUDGET','CANCELLED');
CREATE TYPE "OpeningDependencyType" AS ENUM ('FINISH_TO_START','START_TO_START','FINISH_TO_FINISH');

ALTER TABLE "Document" ADD COLUMN "openingProjectId" TEXT;
ALTER TABLE "BranchTask" ADD COLUMN "openingProjectId" TEXT;
ALTER TABLE "BranchTask" ADD COLUMN "openingStageId" TEXT;
ALTER TABLE "BranchTask" ADD COLUMN "openingMilestoneId" TEXT;

CREATE TABLE "OpeningProjectTemplate" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningProjectTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningStageTemplate" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningStageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningMilestoneTemplate" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningMilestoneTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningMilestoneDependency" (
  "id" TEXT NOT NULL,
  "predecessorMilestoneTemplateId" TEXT NOT NULL,
  "successorMilestoneTemplateId" TEXT NOT NULL,
  "dependencyType" "OpeningDependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
  "lagDays" INTEGER NOT NULL DEFAULT 0,
  "isBlocking" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpeningMilestoneDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningTaskTemplate" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningTaskTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningProject" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "OpeningProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningProjectStage" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningProjectStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningMilestone" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningBudgetItem" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningBudgetItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningRisk" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningRisk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningTargetDateChange" (
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

CREATE TABLE "OpeningReadinessCheck" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningReadinessCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpeningPostOpeningReview" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningPostOpeningReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpeningProjectTemplate_code_version_key" ON "OpeningProjectTemplate"("code", "version");
CREATE INDEX "OpeningProjectTemplate_status_branchConcept_ownershipType_idx" ON "OpeningProjectTemplate"("status", "branchConcept", "ownershipType");
CREATE INDEX "OpeningProjectTemplate_isDefault_idx" ON "OpeningProjectTemplate"("isDefault");
CREATE UNIQUE INDEX "OpeningStageTemplate_templateId_code_key" ON "OpeningStageTemplate"("templateId", "code");
CREATE INDEX "OpeningStageTemplate_templateId_sortOrder_idx" ON "OpeningStageTemplate"("templateId", "sortOrder");
CREATE UNIQUE INDEX "OpeningMilestoneTemplate_stageTemplateId_code_key" ON "OpeningMilestoneTemplate"("stageTemplateId", "code");
CREATE INDEX "OpeningMilestoneTemplate_stageTemplateId_sortOrder_idx" ON "OpeningMilestoneTemplate"("stageTemplateId", "sortOrder");
CREATE UNIQUE INDEX "OpeningMilestoneDependency_predecessorMilestoneTemplateId_successorMilestoneTemplateId_key" ON "OpeningMilestoneDependency"("predecessorMilestoneTemplateId", "successorMilestoneTemplateId");
CREATE INDEX "OpeningTaskTemplate_milestoneTemplateId_sortOrder_idx" ON "OpeningTaskTemplate"("milestoneTemplateId", "sortOrder");
CREATE UNIQUE INDEX "OpeningProject_projectNumber_key" ON "OpeningProject"("projectNumber");
CREATE INDEX "OpeningProject_branchId_status_idx" ON "OpeningProject"("branchId", "status");
CREATE INDEX "OpeningProject_franchiseCandidateId_idx" ON "OpeningProject"("franchiseCandidateId");
CREATE INDEX "OpeningProject_candidateLocationId_idx" ON "OpeningProject"("candidateLocationId");
CREATE INDEX "OpeningProject_targetOpeningDate_status_idx" ON "OpeningProject"("targetOpeningDate", "status");
CREATE INDEX "OpeningProject_riskLevel_status_idx" ON "OpeningProject"("riskLevel", "status");
CREATE INDEX "OpeningProject_archivedAt_idx" ON "OpeningProject"("archivedAt");
CREATE INDEX "OpeningProjectStage_projectId_sortOrder_idx" ON "OpeningProjectStage"("projectId", "sortOrder");
CREATE INDEX "OpeningProjectStage_status_plannedEndDate_idx" ON "OpeningProjectStage"("status", "plannedEndDate");
CREATE INDEX "OpeningMilestone_projectId_status_idx" ON "OpeningMilestone"("projectId", "status");
CREATE INDEX "OpeningMilestone_projectStageId_status_idx" ON "OpeningMilestone"("projectStageId", "status");
CREATE INDEX "OpeningMilestone_dueDate_status_idx" ON "OpeningMilestone"("dueDate", "status");
CREATE INDEX "OpeningMilestone_relatedTaskId_idx" ON "OpeningMilestone"("relatedTaskId");
CREATE INDEX "OpeningBudgetItem_projectId_category_idx" ON "OpeningBudgetItem"("projectId", "category");
CREATE INDEX "OpeningBudgetItem_status_idx" ON "OpeningBudgetItem"("status");
CREATE INDEX "OpeningRisk_projectId_status_idx" ON "OpeningRisk"("projectId", "status");
CREATE INDEX "OpeningRisk_level_status_idx" ON "OpeningRisk"("level", "status");
CREATE INDEX "OpeningTargetDateChange_projectId_createdAt_idx" ON "OpeningTargetDateChange"("projectId", "createdAt");
CREATE INDEX "OpeningReadinessCheck_projectId_component_idx" ON "OpeningReadinessCheck"("projectId", "component");
CREATE INDEX "OpeningReadinessCheck_status_blocker_idx" ON "OpeningReadinessCheck"("status", "blocker");
CREATE UNIQUE INDEX "OpeningPostOpeningReview_projectId_dayNumber_key" ON "OpeningPostOpeningReview"("projectId", "dayNumber");
CREATE INDEX "OpeningPostOpeningReview_status_plannedDate_idx" ON "OpeningPostOpeningReview"("status", "plannedDate");
CREATE INDEX "Document_openingProjectId_idx" ON "Document"("openingProjectId");
CREATE INDEX "BranchTask_openingProjectId_idx" ON "BranchTask"("openingProjectId");
CREATE INDEX "BranchTask_openingStageId_idx" ON "BranchTask"("openingStageId");
CREATE INDEX "BranchTask_openingMilestoneId_idx" ON "BranchTask"("openingMilestoneId");

ALTER TABLE "OpeningStageTemplate" ADD CONSTRAINT "OpeningStageTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OpeningProjectTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningMilestoneTemplate" ADD CONSTRAINT "OpeningMilestoneTemplate_stageTemplateId_fkey" FOREIGN KEY ("stageTemplateId") REFERENCES "OpeningStageTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningMilestoneDependency" ADD CONSTRAINT "OpeningMilestoneDependency_predecessorMilestoneTemplateId_fkey" FOREIGN KEY ("predecessorMilestoneTemplateId") REFERENCES "OpeningMilestoneTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningMilestoneDependency" ADD CONSTRAINT "OpeningMilestoneDependency_successorMilestoneTemplateId_fkey" FOREIGN KEY ("successorMilestoneTemplateId") REFERENCES "OpeningMilestoneTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningTaskTemplate" ADD CONSTRAINT "OpeningTaskTemplate_milestoneTemplateId_fkey" FOREIGN KEY ("milestoneTemplateId") REFERENCES "OpeningMilestoneTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningProject" ADD CONSTRAINT "OpeningProject_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningProject" ADD CONSTRAINT "OpeningProject_franchiseCandidateId_fkey" FOREIGN KEY ("franchiseCandidateId") REFERENCES "FranchiseCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpeningProject" ADD CONSTRAINT "OpeningProject_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OpeningProjectTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpeningProject" ADD CONSTRAINT "OpeningProject_candidateLocationId_fkey" FOREIGN KEY ("candidateLocationId") REFERENCES "CandidateLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpeningProjectStage" ADD CONSTRAINT "OpeningProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningProjectStage" ADD CONSTRAINT "OpeningProjectStage_stageTemplateId_fkey" FOREIGN KEY ("stageTemplateId") REFERENCES "OpeningStageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpeningMilestone" ADD CONSTRAINT "OpeningMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningMilestone" ADD CONSTRAINT "OpeningMilestone_projectStageId_fkey" FOREIGN KEY ("projectStageId") REFERENCES "OpeningProjectStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningMilestone" ADD CONSTRAINT "OpeningMilestone_milestoneTemplateId_fkey" FOREIGN KEY ("milestoneTemplateId") REFERENCES "OpeningMilestoneTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpeningBudgetItem" ADD CONSTRAINT "OpeningBudgetItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningRisk" ADD CONSTRAINT "OpeningRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningTargetDateChange" ADD CONSTRAINT "OpeningTargetDateChange_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningReadinessCheck" ADD CONSTRAINT "OpeningReadinessCheck_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningPostOpeningReview" ADD CONSTRAINT "OpeningPostOpeningReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_openingProjectId_fkey" FOREIGN KEY ("openingProjectId") REFERENCES "OpeningProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BranchTask" ADD CONSTRAINT "BranchTask_openingProjectId_fkey" FOREIGN KEY ("openingProjectId") REFERENCES "OpeningProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchTask" ADD CONSTRAINT "BranchTask_openingStageId_fkey" FOREIGN KEY ("openingStageId") REFERENCES "OpeningProjectStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchTask" ADD CONSTRAINT "BranchTask_openingMilestoneId_fkey" FOREIGN KEY ("openingMilestoneId") REFERENCES "OpeningMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
