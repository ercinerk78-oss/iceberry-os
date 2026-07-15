export const whatsappConfig = {
  verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "1eb90330d659f24a036ddbe4925696622df40c05ea3a20f4",
  appSecret: process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || "",
};
