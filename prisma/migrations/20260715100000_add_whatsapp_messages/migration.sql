-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromPhone" TEXT NOT NULL,
    "contactName" TEXT,
    "businessPhoneNumberId" TEXT,
    "displayPhoneNumber" TEXT,
    "messageType" TEXT NOT NULL,
    "textBody" TEXT,
    "mediaId" TEXT,
    "mediaMimeType" TEXT,
    "mediaSha256" TEXT,
    "payload" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_messageId_key" ON "WhatsAppMessage"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_fromPhone_receivedAt_idx" ON "WhatsAppMessage"("fromPhone", "receivedAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_messageType_idx" ON "WhatsAppMessage"("messageType");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_receivedAt_idx" ON "WhatsAppMessage"("receivedAt");
