export const metaConfig={enabled:process.env.META_INTEGRATION_ENABLED==="true",verifyToken:process.env.META_WEBHOOK_VERIFY_TOKEN||"",appSecret:process.env.META_APP_SECRET||"",pageAccessToken:process.env.META_PAGE_ACCESS_TOKEN||"",graphVersion:process.env.META_GRAPH_API_VERSION||"v23.0"};
export function metaReady(){return metaConfig.enabled&&Boolean(metaConfig.pageAccessToken)}

