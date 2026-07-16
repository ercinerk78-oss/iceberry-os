export const metaConfig = {
  enabled: process.env.META_INTEGRATION_ENABLED === "true",
  appId: process.env.META_APP_ID || "",
  verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "32735b26cb9a3afbd530fa043a6b093eaf3fa013a5b2c44a",
  appSecret: process.env.META_APP_SECRET || "",
  pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN || "",
  graphVersion: process.env.META_GRAPH_API_VERSION || "v23.0",
};

export function metaReady() {
  return Boolean(metaConfig.pageAccessToken);
}
