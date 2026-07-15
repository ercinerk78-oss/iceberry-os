export const whatsappConfig = {
  verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
  appSecret: process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || "",
};
