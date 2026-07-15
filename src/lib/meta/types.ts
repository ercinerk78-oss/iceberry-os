export type MetaField = { name: string; values?: string[] };

export type MetaLeadData = {
  id: string;
  created_time?: string;
  field_data?: MetaField[];
  platform?: string;
  form_id?: string;
  form_name?: string;
  page_id?: string;
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  campaign_name?: string;
};

export type MetaWebhookValue = {
  leadgen_id?: string;
  form_id?: string;
  page_id?: string;
  created_time?: number;
  platform?: string;
  field_data?: MetaField[];
};

export type MetaWebhookChange = {
  field?: string;
  value?: MetaWebhookValue;
};

export type MetaWebhookEntry = {
  id?: string;
  time?: number;
  changes?: MetaWebhookChange[];
};

export type MetaWebhookPayload = {
  object?: string;
  entry?: MetaWebhookEntry[];
};

export type MetaProcessResult = {
  received: true;
  processed: number;
  failed: number;
  skipped?: boolean;
};
