import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { whatsappConfig } from "./config";
import type { WhatsAppIncomingMessage, WhatsAppMedia, WhatsAppWebhookPayload } from "./types";

export class WhatsAppWebhookError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

type PersistedMessage = {
  messageId: string;
  fromPhone: string;
  contactName?: string;
  businessPhoneNumberId?: string;
  displayPhoneNumber?: string;
  messageType: string;
  textBody?: string;
  mediaId?: string;
  mediaMimeType?: string;
  mediaSha256?: string;
  payload: string;
  receivedAt: Date;
};

export class WhatsAppWebhookService {
  verifyWebhookChallenge(searchParams: URLSearchParams) {
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && whatsappConfig.verifyToken && token === whatsappConfig.verifyToken && challenge) {
      return challenge;
    }

    throw new WhatsAppWebhookError("WhatsApp webhook doğrulaması başarısız.", 403);
  }

  async processWebhook(raw: string, signature: string | null) {
    if (!verifyWhatsAppSignature(raw, signature)) {
      await safeIntegrationLog("ERROR", "INVALID_SIGNATURE", "WhatsApp webhook imzası doğrulanamadı.", undefined, raw);
      throw new WhatsAppWebhookError("Geçersiz WhatsApp webhook imzası.", 401);
    }

    const payload = parsePayload(raw);

    if (payload.object !== "whatsapp_business_account") {
      await safeIntegrationLog("IGNORED", "UNSUPPORTED_OBJECT", `Desteklenmeyen WhatsApp nesnesi: ${payload.object || "boş"}`, undefined, payload);
      return { received: true, processed: 0, ignored: true };
    }

    const messages = extractMessages(payload);

    for (const message of messages) {
      await upsertWhatsAppMessage(message);
    }

    await safeIntegrationLog("SUCCESS", "WHATSAPP_WEBHOOK", `${messages.length} WhatsApp mesajı işlendi.`, undefined, {
      messageCount: messages.length,
    });

    return { received: true, processed: messages.length };
  }
}

export function verifyWhatsAppSignature(raw: string, signature: string | null) {
  if (!whatsappConfig.appSecret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", whatsappConfig.appSecret).update(raw).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function parsePayload(raw: string): WhatsAppWebhookPayload {
  try {
    return JSON.parse(raw) as WhatsAppWebhookPayload;
  } catch {
    throw new WhatsAppWebhookError("Geçersiz WhatsApp webhook JSON içeriği.", 400);
  }
}

function extractMessages(payload: WhatsAppWebhookPayload): PersistedMessage[] {
  const rows: PersistedMessage[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages" || !change.value) continue;

      const value = change.value;
      const contactByWaId = new Map<string, string>();

      for (const contact of value.contacts || []) {
        if (contact.wa_id && contact.profile?.name) contactByWaId.set(contact.wa_id, contact.profile.name);
      }

      for (const message of value.messages || []) {
        if (!message.id || !message.from) continue;

        rows.push({
          messageId: message.id,
          fromPhone: message.from,
          contactName: contactByWaId.get(message.from),
          businessPhoneNumberId: value.metadata?.phone_number_id,
          displayPhoneNumber: value.metadata?.display_phone_number,
          messageType: message.type || "unknown",
          textBody: textBodyFor(message),
          ...mediaFieldsFor(message),
          payload: JSON.stringify({ entryId: entry.id, change }),
          receivedAt: message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
        });
      }
    }
  }

  return rows;
}

async function upsertWhatsAppMessage(message: PersistedMessage) {
  await prisma.whatsAppMessage.upsert({
    where: { messageId: message.messageId },
    create: message,
    update: {
      contactName: message.contactName,
      businessPhoneNumberId: message.businessPhoneNumberId,
      displayPhoneNumber: message.displayPhoneNumber,
      messageType: message.messageType,
      textBody: message.textBody,
      mediaId: message.mediaId,
      mediaMimeType: message.mediaMimeType,
      mediaSha256: message.mediaSha256,
      payload: message.payload,
      receivedAt: message.receivedAt,
    },
  });
}

async function safeIntegrationLog(
  status: string,
  eventType: string,
  message: string,
  externalId?: string,
  payload?: unknown,
) {
  try {
    await prisma.integrationLog.create({
      data: {
        provider: "WHATSAPP",
        status,
        eventType,
        message,
        externalId,
        payload: payload ? JSON.stringify(payload).slice(0, 10000) : null,
      },
    });
  } catch {
    // Webhook yanıtı log yazma hatası yüzünden başarısız olmamalı.
  }
}

function textBodyFor(message: WhatsAppIncomingMessage) {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;

  const media = mediaFor(message);
  if (media?.caption) return media.caption;

  return undefined;
}

function mediaFieldsFor(message: WhatsAppIncomingMessage) {
  const media = mediaFor(message);

  return {
    mediaId: media?.id,
    mediaMimeType: media?.mime_type,
    mediaSha256: media?.sha256,
  };
}

function mediaFor(message: WhatsAppIncomingMessage): WhatsAppMedia | undefined {
  return message.image || message.audio || message.video || message.document || message.sticker;
}
