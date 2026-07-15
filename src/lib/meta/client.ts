import { createHmac, timingSafeEqual } from "node:crypto";

import { metaConfig, metaReady } from "./config";
import type { MetaLeadData, MetaWebhookValue } from "./types";

const GRAPH_RETRY_DELAYS_MS = [250, 750, 1500];

type MetaApiError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

export function verifyMetaSignature(raw: string, signature: string | null) {
  if (!metaConfig.appSecret) return !metaConfig.enabled;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", metaConfig.appSecret).update(raw).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function getMetaLead(value: MetaWebhookValue): Promise<MetaLeadData> {
  if (value.field_data && value.leadgen_id) {
    return {
      id: value.leadgen_id,
      field_data: value.field_data,
      platform: value.platform,
      form_id: value.form_id,
      page_id: value.page_id,
      created_time: value.created_time ? new Date(value.created_time * 1000).toISOString() : undefined,
    };
  }

  if (!value.leadgen_id) throw new Error("Meta lead kimliği bulunamadı.");
  if (!metaReady()) throw new Error("Meta API kapalı veya erişim anahtarı tanımlı değil.");

  const fields = [
    "id",
    "created_time",
    "field_data",
    "platform",
    "form_id",
    "ad_id",
    "ad_name",
    "campaign_id",
    "campaign_name",
  ].join(",");

  const data = await getGraph<MetaLeadData & MetaApiError>(value.leadgen_id, { fields });

  if (data.error) {
    throw new Error(data.error.message || "Meta Graph API lead hatası.");
  }

  const formId = data.form_id || value.form_id;
  const formName = formId ? await getMetaFormName(formId).catch(() => undefined) : undefined;

  return {
    ...data,
    page_id: value.page_id,
    form_id: formId,
    form_name: formName,
    platform: data.platform || value.platform,
  };
}

async function getMetaFormName(formId: string) {
  const data = await getGraph<{ name?: string } & MetaApiError>(formId, { fields: "name" });

  if (data.error) throw new Error(data.error.message || "Meta Graph API form hatası.");

  return data.name;
}

async function getGraph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${metaConfig.graphVersion}/${encodeURIComponent(path)}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("access_token", metaConfig.pageAccessToken);

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < GRAPH_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as T & MetaApiError;

      if (response.ok && !body.error) return body;

      const message = body.error?.message || `Meta Graph API yanıtı başarısız (${response.status}).`;
      lastError = new Error(message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Meta Graph API çağrısı başarısız.");
    }

    if (attempt < GRAPH_RETRY_DELAYS_MS.length - 1) {
      await delay(GRAPH_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError || new Error("Meta Graph API çağrısı başarısız.");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
