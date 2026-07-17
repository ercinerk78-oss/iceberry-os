DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingProgramStatus') THEN CREATE TYPE "TrainingProgramStatus" AS ENUM ('DRAFT','REVIEW','APPROVED','PUBLISHED','ARCHIVED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingDifficulty') THEN CREATE TYPE "TrainingDifficulty" AS ENUM ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingLessonType') THEN CREATE TYPE "TrainingLessonType" AS ENUM ('VIDEO','TEXT','DOCUMENT','PDF','IMAGE','EXTERNAL_LINK','QUIZ','PRACTICAL_TASK','ACKNOWLEDGEMENT'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingAssignmentStatus') THEN CREATE TYPE "TrainingAssignmentStatus" AS ENUM ('ASSIGNED','NOT_STARTED','IN_PROGRESS','COMPLETED','FAILED','OVERDUE','EXEMPTED','CANCELLED','EXPIRED','RENEWAL_REQUIRED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingAssignmentSource') THEN CREATE TYPE "TrainingAssignmentSource" AS ENUM ('MANUAL','ROLE_BASED','BRANCH_BASED','CONCEPT_BASED','ORIENTATION','OPENING_PROJECT','AUDIT_FINDING','CORRECTIVE_ACTION','DEVELOPMENT_PLAN','DOCUMENT_UPDATE','CERTIFICATE_RENEWAL','SYSTEM_POLICY','OTHER'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingResult') THEN CREATE TYPE "TrainingResult" AS ENUM ('PASSED','FAILED','PENDING_APPROVAL'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LessonProgressStatus') THEN CREATE TYPE "LessonProgressStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','COMPLETED','FAILED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LearningPathStatus') THEN CREATE TYPE "LearningPathStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuizStatus') THEN CREATE TYPE "QuizStatus" AS ENUM ('DRAFT','REVIEW','PUBLISHED','ARCHIVED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuizQuestionType') THEN CREATE TYPE "QuizQuestionType" AS ENUM ('SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','TEXT'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuizAttemptStatus') THEN CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS','SUBMITTED','EVALUATED','CANCELLED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificateStatus') THEN CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE','EXPIRED','REVOKED','RENEWED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CorporateDocumentStatus') THEN CREATE TYPE "CorporateDocumentStatus" AS ENUM ('DRAFT','REVIEW','APPROVED','PUBLISHED','ARCHIVED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentVersionStatus') THEN CREATE TYPE "DocumentVersionStatus" AS ENUM ('DRAFT','REVIEW','APPROVED','PUBLISHED','ARCHIVED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentConfidentiality') THEN CREATE TYPE "DocumentConfidentiality" AS ENUM ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentAcknowledgementStatus') THEN CREATE TYPE "DocumentAcknowledgementStatus" AS ENUM ('ASSIGNED','OPENED','ACKNOWLEDGED','OVERDUE','CANCELLED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LiveTrainingStatus') THEN CREATE TYPE "LiveTrainingStatus" AS ENUM ('PLANNED','OPEN_FOR_REGISTRATION','COMPLETED','CANCELLED'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LiveAttendanceStatus') THEN CREATE TYPE "LiveAttendanceStatus" AS ENUM ('REGISTERED','ATTENDED','NO_SHOW','CANCELLED'); END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TrainingCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "parentId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "icon" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TrainingProgram" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "categoryId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "TrainingProgramStatus" NOT NULL DEFAULT 'DRAFT',
  "difficultyLevel" "TrainingDifficulty" NOT NULL DEFAULT 'BEGINNER',
  "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 0,
  "passingScore" INTEGER NOT NULL DEFAULT 70,
  "maximumAttempts" INTEGER NOT NULL DEFAULT 3,
  "completionValidityDays" INTEGER,
  "certificateValidityDays" INTEGER,
  "requiresCertificate" BOOLEAN NOT NULL DEFAULT false,
  "requiresFinalExam" BOOLEAN NOT NULL DEFAULT false,
  "requiresManagerApproval" BOOLEAN NOT NULL DEFAULT false,
  "allowSelfEnrollment" BOOLEAN NOT NULL DEFAULT false,
  "isMandatory" BOOLEAN NOT NULL DEFAULT false,
  "language" TEXT NOT NULL DEFAULT 'tr',
  "coverImageDocumentId" TEXT,
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TrainingModule" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "completionRule" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TrainingLesson" (
  "id" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "lessonType" "TrainingLessonType" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "minimumWatchPercentage" INTEGER NOT NULL DEFAULT 90,
  "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
  "requiresTaskCompletion" BOOLEAN NOT NULL DEFAULT false,
  "relatedDocumentId" TEXT,
  "relatedQuizId" TEXT,
  "externalUrl" TEXT,
  "videoDocumentId" TEXT,
  "thumbnailDocumentId" TEXT,
  "contentHtml" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TrainingAssignment" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "programVersion" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "branchId" TEXT,
  "openingProjectId" TEXT,
  "sourceType" "TrainingAssignmentSource" NOT NULL DEFAULT 'MANUAL',
  "sourceId" TEXT,
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "status" "TrainingAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "finalScore" DOUBLE PRECISION,
  "result" "TrainingResult",
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "exemptionReason" TEXT,
  "exemptedById" TEXT,
  "exemptedAt" TIMESTAMP(3),
  "certificateId" TEXT,
  "renewalDueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LessonProgress" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "LessonProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
  "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastAccessedAt" TIMESTAMP(3),
  "acknowledgementAt" TIMESTAMP(3),
  "practicalTaskId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LearningPath" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "LearningPathStatus" NOT NULL DEFAULT 'DRAFT',
  "targetRoleCode" TEXT,
  "branchConcept" TEXT,
  "country" TEXT NOT NULL DEFAULT 'Türkiye',
  "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 0,
  "completionValidityDays" INTEGER,
  "createdById" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LearningPathProgram" (
  "id" TEXT NOT NULL,
  "learningPathId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "prerequisiteProgramId" TEXT,
  "dueOffsetDays" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningPathProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Quiz" (
  "id" TEXT NOT NULL,
  "programId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
  "passingScore" INTEGER NOT NULL DEFAULT 70,
  "timeLimitMinutes" INTEGER,
  "maximumAttempts" INTEGER NOT NULL DEFAULT 3,
  "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
  "shuffleOptions" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizQuestion" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "questionType" "QuizQuestionType" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "points" INTEGER NOT NULL DEFAULT 1,
  "explanation" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizOption" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "optionText" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizAttempt" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "assignmentId" TEXT,
  "userId" TEXT NOT NULL,
  "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "score" DOUBLE PRECISION,
  "passed" BOOLEAN,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "evaluatedAt" TIMESTAMP(3),
  "questionSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuizAttemptAnswer" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOptionIds" TEXT,
  "answerText" TEXT,
  "isCorrect" BOOLEAN,
  "pointsAwarded" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAttemptAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TrainingCertificate" (
  "id" TEXT NOT NULL,
  "certificateNumber" TEXT NOT NULL,
  "verificationCode" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignmentId" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "status" "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revokeReason" TEXT,
  "pdfDocumentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingCertificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CorporateDocumentCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorporateDocumentCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CorporateDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "categoryId" TEXT NOT NULL,
  "status" "CorporateDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "confidentiality" "DocumentConfidentiality" NOT NULL DEFAULT 'INTERNAL',
  "ownerRoleCode" TEXT,
  "branchConcept" TEXT,
  "country" TEXT NOT NULL DEFAULT 'Türkiye',
  "reviewDueAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorporateDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CorporateDocumentVersion" (
  "id" TEXT NOT NULL,
  "corporateDocumentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "contentHtml" TEXT,
  "fileDocumentId" TEXT,
  "changeSummary" TEXT,
  "status" "DocumentVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorporateDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentAcknowledgement" (
  "id" TEXT NOT NULL,
  "corporateDocumentId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "branchId" TEXT,
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "status" "DocumentAcknowledgementStatus" NOT NULL DEFAULT 'ASSIGNED',
  "evidenceText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LiveTrainingSession" (
  "id" TEXT NOT NULL,
  "programId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "trainerName" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "capacity" INTEGER,
  "location" TEXT,
  "meetingUrl" TEXT,
  "status" "LiveTrainingStatus" NOT NULL DEFAULT 'PLANNED',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveTrainingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LiveTrainingAttendance" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "LiveAttendanceStatus" NOT NULL DEFAULT 'REGISTERED',
  "attendedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveTrainingAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCategory_code_key" ON "TrainingCategory"("code");
CREATE INDEX IF NOT EXISTS "TrainingCategory_parentId_idx" ON "TrainingCategory"("parentId");
CREATE INDEX IF NOT EXISTS "TrainingCategory_isActive_sortOrder_idx" ON "TrainingCategory"("isActive", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingProgram_code_version_key" ON "TrainingProgram"("code", "version");
CREATE INDEX IF NOT EXISTS "TrainingProgram_categoryId_status_idx" ON "TrainingProgram"("categoryId", "status");
CREATE INDEX IF NOT EXISTS "TrainingProgram_status_isMandatory_idx" ON "TrainingProgram"("status", "isMandatory");
CREATE INDEX IF NOT EXISTS "TrainingModule_programId_sortOrder_idx" ON "TrainingModule"("programId", "sortOrder");
CREATE INDEX IF NOT EXISTS "TrainingLesson_moduleId_sortOrder_idx" ON "TrainingLesson"("moduleId", "sortOrder");
CREATE INDEX IF NOT EXISTS "TrainingLesson_lessonType_idx" ON "TrainingLesson"("lessonType");
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingAssignment_programId_programVersion_userId_sourceType_sourceId_key" ON "TrainingAssignment"("programId", "programVersion", "userId", "sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "TrainingAssignment_userId_status_idx" ON "TrainingAssignment"("userId", "status");
CREATE INDEX IF NOT EXISTS "TrainingAssignment_branchId_status_idx" ON "TrainingAssignment"("branchId", "status");
CREATE INDEX IF NOT EXISTS "TrainingAssignment_openingProjectId_status_idx" ON "TrainingAssignment"("openingProjectId", "status");
CREATE INDEX IF NOT EXISTS "TrainingAssignment_dueAt_status_idx" ON "TrainingAssignment"("dueAt", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "LessonProgress_assignmentId_lessonId_key" ON "LessonProgress"("assignmentId", "lessonId");
CREATE INDEX IF NOT EXISTS "LessonProgress_userId_status_idx" ON "LessonProgress"("userId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "LearningPath_code_version_key" ON "LearningPath"("code", "version");
CREATE INDEX IF NOT EXISTS "LearningPath_status_targetRoleCode_idx" ON "LearningPath"("status", "targetRoleCode");
CREATE UNIQUE INDEX IF NOT EXISTS "LearningPathProgram_learningPathId_programId_key" ON "LearningPathProgram"("learningPathId", "programId");
CREATE INDEX IF NOT EXISTS "LearningPathProgram_learningPathId_sortOrder_idx" ON "LearningPathProgram"("learningPathId", "sortOrder");
CREATE INDEX IF NOT EXISTS "Quiz_programId_status_idx" ON "Quiz"("programId", "status");
CREATE INDEX IF NOT EXISTS "QuizQuestion_quizId_sortOrder_idx" ON "QuizQuestion"("quizId", "sortOrder");
CREATE INDEX IF NOT EXISTS "QuizOption_questionId_sortOrder_idx" ON "QuizOption"("questionId", "sortOrder");
CREATE INDEX IF NOT EXISTS "QuizAttempt_quizId_userId_idx" ON "QuizAttempt"("quizId", "userId");
CREATE INDEX IF NOT EXISTS "QuizAttempt_assignmentId_idx" ON "QuizAttempt"("assignmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "QuizAttemptAnswer_attemptId_questionId_key" ON "QuizAttemptAnswer"("attemptId", "questionId");
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCertificate_certificateNumber_key" ON "TrainingCertificate"("certificateNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCertificate_verificationCode_key" ON "TrainingCertificate"("verificationCode");
CREATE INDEX IF NOT EXISTS "TrainingCertificate_userId_status_idx" ON "TrainingCertificate"("userId", "status");
CREATE INDEX IF NOT EXISTS "TrainingCertificate_validUntil_status_idx" ON "TrainingCertificate"("validUntil", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "CorporateDocumentCategory_code_key" ON "CorporateDocumentCategory"("code");
CREATE INDEX IF NOT EXISTS "CorporateDocumentCategory_isActive_sortOrder_idx" ON "CorporateDocumentCategory"("isActive", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "CorporateDocument_code_key" ON "CorporateDocument"("code");
CREATE INDEX IF NOT EXISTS "CorporateDocument_categoryId_status_idx" ON "CorporateDocument"("categoryId", "status");
CREATE INDEX IF NOT EXISTS "CorporateDocument_confidentiality_status_idx" ON "CorporateDocument"("confidentiality", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "CorporateDocumentVersion_corporateDocumentId_version_key" ON "CorporateDocumentVersion"("corporateDocumentId", "version");
CREATE INDEX IF NOT EXISTS "CorporateDocumentVersion_status_publishedAt_idx" ON "CorporateDocumentVersion"("status", "publishedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentAcknowledgement_versionId_userId_key" ON "DocumentAcknowledgement"("versionId", "userId");
CREATE INDEX IF NOT EXISTS "DocumentAcknowledgement_userId_status_idx" ON "DocumentAcknowledgement"("userId", "status");
CREATE INDEX IF NOT EXISTS "DocumentAcknowledgement_branchId_status_idx" ON "DocumentAcknowledgement"("branchId", "status");
CREATE INDEX IF NOT EXISTS "DocumentAcknowledgement_dueAt_status_idx" ON "DocumentAcknowledgement"("dueAt", "status");
CREATE INDEX IF NOT EXISTS "LiveTrainingSession_startsAt_status_idx" ON "LiveTrainingSession"("startsAt", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "LiveTrainingAttendance_sessionId_userId_key" ON "LiveTrainingAttendance"("sessionId", "userId");
CREATE INDEX IF NOT EXISTS "LiveTrainingAttendance_userId_status_idx" ON "LiveTrainingAttendance"("userId", "status");
