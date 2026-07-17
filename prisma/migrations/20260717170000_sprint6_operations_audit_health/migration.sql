ALTER TABLE "BranchTask" ADD COLUMN "auditId" TEXT;
ALTER TABLE "BranchTask" ADD COLUMN "findingId" TEXT;
ALTER TABLE "BranchTask" ADD COLUMN "correctiveActionId" TEXT;

CREATE TABLE "AuditTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "auditType" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "country" TEXT,
  "branchConcept" TEXT,
  "ownershipType" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "scoringMethod" TEXT NOT NULL DEFAULT 'WEIGHTED_PERCENTAGE',
  "passingScore" DECIMAL(5,2) NOT NULL DEFAULT 80,
  "warningScore" DECIMAL(5,2) NOT NULL DEFAULT 70,
  "criticalFailurePolicy" TEXT NOT NULL DEFAULT 'FAIL_AUDIT',
  "requiresFinalApproval" BOOLEAN NOT NULL DEFAULT true,
  "allowNotApplicable" BOOLEAN NOT NULL DEFAULT true,
  "allowPartialCompletion" BOOLEAN NOT NULL DEFAULT true,
  "estimatedDurationMinutes" INTEGER,
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditSection" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "weight" DECIMAL(8,4) NOT NULL DEFAULT 1,
  "minimumSectionScore" DECIMAL(5,2),
  "isCriticalSection" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditQuestion" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "instruction" TEXT,
  "questionType" TEXT NOT NULL,
  "scoringType" TEXT NOT NULL DEFAULT 'FULL_OR_ZERO',
  "maximumScore" DECIMAL(8,2) NOT NULL DEFAULT 1,
  "weight" DECIMAL(8,4) NOT NULL DEFAULT 1,
  "passingScore" DECIMAL(8,2),
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "criticalFailureValue" TEXT,
  "allowNotApplicable" BOOLEAN NOT NULL DEFAULT true,
  "requiresComment" BOOLEAN NOT NULL DEFAULT false,
  "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
  "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
  "requiresMeasurement" BOOLEAN NOT NULL DEFAULT false,
  "requiresCorrectiveAction" BOOLEAN NOT NULL DEFAULT false,
  "autoCreateTaskOnFailure" BOOLEAN NOT NULL DEFAULT false,
  "taskPriorityOnFailure" TEXT NOT NULL DEFAULT 'HIGH',
  "taskDueDays" INTEGER NOT NULL DEFAULT 7,
  "repeatFailureThreshold" INTEGER NOT NULL DEFAULT 3,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditQuestionOption" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "score" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "isFailure" BOOLEAN NOT NULL DEFAULT false,
  "isCriticalFailure" BOOLEAN NOT NULL DEFAULT false,
  "requiresComment" BOOLEAN NOT NULL DEFAULT false,
  "requiresEvidence" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditQuestionOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditQuestionCondition" (
  "id" TEXT NOT NULL,
  "sourceQuestionId" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "comparisonValue" TEXT,
  "targetQuestionId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditQuestionCondition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditAssignment" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "auditType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "scheduledStartAt" TIMESTAMP(3),
  "scheduledEndAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3) NOT NULL,
  "assignedAuditorId" TEXT,
  "assignedById" TEXT,
  "reviewerId" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "recurrenceRule" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "relatedAlertId" TEXT,
  "relatedTaskId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Audit" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT,
  "branchId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "auditType" TEXT NOT NULL,
  "auditorId" TEXT,
  "reviewerId" TEXT,
  "startedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "totalScore" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "maximumScore" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "percentageScore" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "passingScore" DECIMAL(5,2) NOT NULL DEFAULT 80,
  "result" TEXT NOT NULL DEFAULT 'INCOMPLETE',
  "criticalFindingCount" INTEGER NOT NULL DEFAULT 0,
  "majorFindingCount" INTEGER NOT NULL DEFAULT 0,
  "minorFindingCount" INTEGER NOT NULL DEFAULT 0,
  "notApplicableCount" INTEGER NOT NULL DEFAULT 0,
  "unansweredCount" INTEGER NOT NULL DEFAULT 0,
  "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
  "followUpDueAt" TIMESTAMP(3),
  "summary" TEXT,
  "auditorNote" TEXT,
  "reviewerNote" TEXT,
  "branchResponse" TEXT,
  "deviceInfo" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditAnswer" (
  "id" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "questionSnapshot" TEXT NOT NULL,
  "answerValue" TEXT,
  "selectedOptionIds" TEXT,
  "numericValue" DECIMAL(12,4),
  "textValue" TEXT,
  "dateValue" TIMESTAMP(3),
  "measurementValue" DECIMAL(12,4),
  "measurementUnit" TEXT,
  "score" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "maximumScore" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "isPassed" BOOLEAN NOT NULL DEFAULT false,
  "isNotApplicable" BOOLEAN NOT NULL DEFAULT false,
  "isCriticalFailure" BOOLEAN NOT NULL DEFAULT false,
  "comment" TEXT,
  "answeredById" TEXT,
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvidence" (
  "id" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "answerId" TEXT,
  "findingId" TEXT,
  "correctiveActionId" TEXT,
  "documentId" TEXT,
  "evidenceType" TEXT NOT NULL,
  "caption" TEXT,
  "takenAt" TIMESTAMP(3),
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditFinding" (
  "id" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "answerId" TEXT,
  "sectionId" TEXT,
  "questionId" TEXT,
  "findingNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MINOR',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "isRepeatFinding" BOOLEAN NOT NULL DEFAULT false,
  "previousFindingId" TEXT,
  "repeatCount" INTEGER NOT NULL DEFAULT 1,
  "rootCause" TEXT,
  "immediateAction" TEXT,
  "assignedUserId" TEXT,
  "dueAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CorrectiveAction" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "auditId" TEXT,
  "findingId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "actionType" TEXT NOT NULL DEFAULT 'OTHER',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "assignedUserId" TEXT,
  "assignedById" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
  "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
  "requiresComment" BOOLEAN NOT NULL DEFAULT true,
  "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT true,
  "taskId" TEXT,
  "completedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "rejectionReason" TEXT,
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BranchHealthScoreSnapshot" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "score" DECIMAL(5,2) NOT NULL,
  "previousScore" DECIMAL(5,2),
  "auditComponent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "findingComponent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "taskComponent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "revenueComponent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "supplyComponent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "financeComponent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "googleComponent" DECIMAL(5,2),
  "weightsSnapshot" TEXT NOT NULL,
  "positiveFactors" TEXT,
  "negativeFactors" TEXT,
  "criticalRisks" TEXT,
  "missingData" TEXT,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BranchHealthScoreSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditTemplate_code_version_key" ON "AuditTemplate"("code", "version");
CREATE INDEX "AuditTemplate_status_auditType_idx" ON "AuditTemplate"("status", "auditType");
CREATE INDEX "AuditTemplate_branchConcept_ownershipType_idx" ON "AuditTemplate"("branchConcept", "ownershipType");
CREATE UNIQUE INDEX "AuditSection_templateId_code_key" ON "AuditSection"("templateId", "code");
CREATE INDEX "AuditSection_templateId_isActive_sortOrder_idx" ON "AuditSection"("templateId", "isActive", "sortOrder");
CREATE UNIQUE INDEX "AuditQuestion_sectionId_code_key" ON "AuditQuestion"("sectionId", "code");
CREATE INDEX "AuditQuestion_sectionId_isActive_sortOrder_idx" ON "AuditQuestion"("sectionId", "isActive", "sortOrder");
CREATE INDEX "AuditQuestion_isCritical_idx" ON "AuditQuestion"("isCritical");
CREATE UNIQUE INDEX "AuditQuestionOption_questionId_value_key" ON "AuditQuestionOption"("questionId", "value");
CREATE INDEX "AuditQuestionOption_questionId_isActive_sortOrder_idx" ON "AuditQuestionOption"("questionId", "isActive", "sortOrder");
CREATE INDEX "AuditQuestionCondition_sourceQuestionId_idx" ON "AuditQuestionCondition"("sourceQuestionId");
CREATE INDEX "AuditQuestionCondition_targetQuestionId_idx" ON "AuditQuestionCondition"("targetQuestionId");
CREATE INDEX "AuditAssignment_branchId_status_idx" ON "AuditAssignment"("branchId", "status");
CREATE INDEX "AuditAssignment_assignedAuditorId_status_idx" ON "AuditAssignment"("assignedAuditorId", "status");
CREATE INDEX "AuditAssignment_dueAt_status_idx" ON "AuditAssignment"("dueAt", "status");
CREATE INDEX "AuditAssignment_templateId_templateVersion_idx" ON "AuditAssignment"("templateId", "templateVersion");
CREATE UNIQUE INDEX "Audit_assignmentId_key" ON "Audit"("assignmentId");
CREATE INDEX "Audit_branchId_status_idx" ON "Audit"("branchId", "status");
CREATE INDEX "Audit_auditType_createdAt_idx" ON "Audit"("auditType", "createdAt");
CREATE INDEX "Audit_templateId_templateVersion_idx" ON "Audit"("templateId", "templateVersion");
CREATE INDEX "Audit_result_idx" ON "Audit"("result");
CREATE UNIQUE INDEX "AuditAnswer_auditId_questionId_key" ON "AuditAnswer"("auditId", "questionId");
CREATE INDEX "AuditAnswer_auditId_idx" ON "AuditAnswer"("auditId");
CREATE INDEX "AuditAnswer_questionId_idx" ON "AuditAnswer"("questionId");
CREATE INDEX "AuditAnswer_isCriticalFailure_idx" ON "AuditAnswer"("isCriticalFailure");
CREATE INDEX "AuditEvidence_auditId_idx" ON "AuditEvidence"("auditId");
CREATE INDEX "AuditEvidence_answerId_idx" ON "AuditEvidence"("answerId");
CREATE INDEX "AuditEvidence_findingId_idx" ON "AuditEvidence"("findingId");
CREATE INDEX "AuditEvidence_correctiveActionId_idx" ON "AuditEvidence"("correctiveActionId");
CREATE INDEX "AuditEvidence_documentId_idx" ON "AuditEvidence"("documentId");
CREATE UNIQUE INDEX "AuditFinding_findingNumber_key" ON "AuditFinding"("findingNumber");
CREATE INDEX "AuditFinding_branchId_status_idx" ON "AuditFinding"("branchId", "status");
CREATE INDEX "AuditFinding_auditId_idx" ON "AuditFinding"("auditId");
CREATE INDEX "AuditFinding_severity_status_idx" ON "AuditFinding"("severity", "status");
CREATE INDEX "AuditFinding_questionId_branchId_idx" ON "AuditFinding"("questionId", "branchId");
CREATE INDEX "CorrectiveAction_branchId_status_idx" ON "CorrectiveAction"("branchId", "status");
CREATE INDEX "CorrectiveAction_auditId_idx" ON "CorrectiveAction"("auditId");
CREATE INDEX "CorrectiveAction_findingId_idx" ON "CorrectiveAction"("findingId");
CREATE INDEX "CorrectiveAction_taskId_idx" ON "CorrectiveAction"("taskId");
CREATE INDEX "CorrectiveAction_dueAt_status_idx" ON "CorrectiveAction"("dueAt", "status");
CREATE INDEX "BranchHealthScoreSnapshot_branchId_calculatedAt_idx" ON "BranchHealthScoreSnapshot"("branchId", "calculatedAt");
CREATE INDEX "BranchHealthScoreSnapshot_score_idx" ON "BranchHealthScoreSnapshot"("score");
CREATE INDEX "BranchTask_auditId_idx" ON "BranchTask"("auditId");
CREATE INDEX "BranchTask_findingId_idx" ON "BranchTask"("findingId");
CREATE INDEX "BranchTask_correctiveActionId_idx" ON "BranchTask"("correctiveActionId");

ALTER TABLE "AuditSection" ADD CONSTRAINT "AuditSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AuditTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditQuestion" ADD CONSTRAINT "AuditQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AuditSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditQuestionOption" ADD CONSTRAINT "AuditQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AuditQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditQuestionCondition" ADD CONSTRAINT "AuditQuestionCondition_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "AuditQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditQuestionCondition" ADD CONSTRAINT "AuditQuestionCondition_targetQuestionId_fkey" FOREIGN KEY ("targetQuestionId") REFERENCES "AuditQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditAssignment" ADD CONSTRAINT "AuditAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditAssignment" ADD CONSTRAINT "AuditAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AuditTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AuditAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AuditTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditAnswer" ADD CONSTRAINT "AuditAnswer_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditAnswer" ADD CONSTRAINT "AuditAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AuditQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvidence" ADD CONSTRAINT "AuditEvidence_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvidence" ADD CONSTRAINT "AuditEvidence_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "AuditAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvidence" ADD CONSTRAINT "AuditEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "AuditFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvidence" ADD CONSTRAINT "AuditEvidence_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "CorrectiveAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "AuditAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AuditSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AuditQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "AuditFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchHealthScoreSnapshot" ADD CONSTRAINT "BranchHealthScoreSnapshot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
