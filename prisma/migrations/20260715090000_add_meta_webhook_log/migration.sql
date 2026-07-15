-- CreateTable
CREATE TABLE "MetaWebhookLog" (
    "id" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadgenId" TEXT,
    "payload" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaWebhookLog_eventTime_idx" ON "MetaWebhookLog"("eventTime");

-- CreateIndex
CREATE INDEX "MetaWebhookLog_leadgenId_idx" ON "MetaWebhookLog"("leadgenId");

-- CreateIndex
CREATE INDEX "MetaWebhookLog_result_idx" ON "MetaWebhookLog"("result");
