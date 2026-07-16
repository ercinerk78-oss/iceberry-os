import { prisma } from "@/lib/prisma";

import { getMetaLead, verifyMetaSignature } from "./client";
import { metaConfig } from "./config";
import { integrationLog, syncMetaLead } from "./lead-sync";
import type { MetaProcessResult, MetaWebhookChange, MetaWebhookPayload } from "./types";

export class MetaWebhookError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export class MetaLeadService {
  verifyWebhookChallenge(searchParams: URLSearchParams) {
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && metaConfig.verifyToken && token === metaConfig.verifyToken && challenge) {
      return challenge;
    }

    throw new MetaWebhookError("Webhook doğrulaması başarısız.", 403);
  }

  async processWebhook(raw: string, signature: string | null): Promise<MetaProcessResult> {
    console.log("[Meta Webhook POST] Raw payload", raw);

    if (!verifyMetaSignature(raw, signature)) {
      console.error("[Meta Webhook POST] İmza doğrulama hatası", {
        hasSignature: Boolean(signature),
        hasAppSecret: Boolean(metaConfig.appSecret),
        integrationEnabled: metaConfig.enabled,
      });
      await this.logWebhook({ payload: raw, result: "ERROR", error: "Meta webhook imzası doğrulanamadı." });
      await safeIntegrationLog("ERROR", "INVALID_SIGNATURE", "Meta webhook imzası doğrulanamadı.");
      throw new MetaWebhookError("Geçersiz webhook imzası.", 401);
    }

    const payload = await this.parsePayload(raw);

    if (!metaConfig.enabled) {
      console.warn("[Meta Webhook POST] META_INTEGRATION_ENABLED true değil; lead yine de işlenecek.", {
        META_INTEGRATION_ENABLED: process.env.META_INTEGRATION_ENABLED,
      });
    }

    if (payload.object !== "page") {
      console.warn("[Meta Webhook POST] Desteklenmeyen payload object", { object: payload.object });
      await this.logWebhook({ payload, result: "IGNORED", error: `Desteklenmeyen Meta nesnesi: ${payload.object || "boş"}.` });
      await safeIntegrationLog("IGNORED", "UNSUPPORTED_OBJECT", `Desteklenmeyen Meta nesnesi: ${payload.object || "boş"}`, undefined, payload);
      return { received: true, processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const { entryId, change } of extractLeadgenChanges(payload)) {
      const value = change.value;
      const leadgenId = value?.leadgen_id;

      console.log("[Meta Webhook POST] Leadgen change alındı", {
        entryId,
        leadgenId,
        formId: value?.form_id,
        pageId: value?.page_id || entryId,
        field: change.field,
      });

      if (!value || !leadgenId) {
        failed++;
        console.error("[Meta Webhook POST] leadgen_id bulunamadı", { entryId, change });
        await this.logWebhook({
          payload: { entryId, change },
          result: "ERROR",
          error: "leadgen_id bulunamadı.",
        });
        await safeIntegrationLog("ERROR", "MISSING_LEADGEN_ID", "Webhook içinde leadgen_id bulunamadı.", undefined, { entryId, change });
        continue;
      }

      try {
        const metaLead = await getMetaLead({ ...value, page_id: value.page_id || entryId });
        console.log("[Meta Webhook POST] Graph API lead detayı alındı", {
          leadgenId: metaLead.id,
          fieldCount: metaLead.field_data?.length || 0,
          formId: metaLead.form_id,
          formName: metaLead.form_name,
          campaignName: metaLead.campaign_name,
          platform: metaLead.platform,
        });
        const result = await syncMetaLead(metaLead);
        const eventType = result.created ? "LEAD_CREATED" : result.duplicate ? "LEAD_DUPLICATE" : "LEAD_UPDATED";
        const message = result.created
          ? "Meta lead oluşturuldu."
          : result.duplicate
            ? "Meta üzerinden tekrar başvuru mevcut lead kaydına işlendi."
            : "Mevcut lead Meta verileriyle güncellendi.";

        await this.logWebhook({
          leadgenId,
          payload: { entryId, formId: value.form_id, pageId: value.page_id || entryId },
          result: "SUCCESS",
        });
        await safeIntegrationLog("SUCCESS", eventType, message, leadgenId, { entryId, formId: value.form_id });
        console.log("[Meta Webhook POST] Lead veritabanına işlendi", {
          leadgenId,
          leadId: result.lead.id,
          created: result.created,
          duplicate: result.duplicate,
          eventType,
        });
        processed++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "Meta lead işlenemedi.";

        console.error("[Meta Webhook POST] Lead işlenemedi", {
          entryId,
          leadgenId,
          formId: value.form_id,
          reason: message,
          hasPageAccessToken: Boolean(metaConfig.pageAccessToken),
          integrationEnabled: metaConfig.enabled,
        });

        await this.logWebhook({
          leadgenId,
          payload: { entryId, change },
          result: "ERROR",
          error: message,
          retryCount: 3,
        });
        await safeIntegrationLog("ERROR", "LEAD_PROCESSING", message, leadgenId, { entryId, formId: value.form_id });
      }
    }

    return { received: true, processed, failed };
  }

  async logWebhook(input: {
    leadgenId?: string;
    payload: unknown;
    result: string;
    error?: string;
    retryCount?: number;
  }) {
    try {
      await prisma.metaWebhookLog.create({
        data: {
          eventTime: new Date(),
          leadgenId: input.leadgenId,
          payload: stringifyPayload(input.payload),
          result: input.result,
          error: input.error,
          retryCount: input.retryCount || 0,
        },
      });
    } catch {
      // Webhook yanıtı log veritabanı hatası yüzünden başarısız olmamalı.
    }
  }

  private async parsePayload(raw: string) {
    try {
      return JSON.parse(raw) as MetaWebhookPayload;
    } catch {
      await this.logWebhook({ payload: raw, result: "ERROR", error: "Webhook içeriği geçerli JSON değil." });
      await safeIntegrationLog("ERROR", "INVALID_PAYLOAD", "Webhook içeriği geçerli JSON değil.");
      throw new MetaWebhookError("Geçersiz JSON.", 400);
    }
  }
}

function extractLeadgenChanges(payload: MetaWebhookPayload) {
  const changes: Array<{ entryId?: string; change: MetaWebhookChange }> = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === "leadgen") {
        changes.push({ entryId: entry.id, change });
      }
    }
  }

  return changes;
}

async function safeIntegrationLog(
  status: string,
  eventType: string,
  message: string,
  externalId?: string,
  payload?: unknown,
) {
  try {
    await integrationLog(status, eventType, message, externalId, payload);
  } catch {
    // IntegrationLog yardımcıdır; webhook akışını kilitlememeli.
  }
}

function stringifyPayload(payload: unknown) {
  if (typeof payload === "string") return payload.slice(0, 50000);

  return JSON.stringify(payload).slice(0, 50000);
}
