import { createHmac, timingSafeEqual } from "node:crypto";

import { TicimaxOrderService } from "@/lib/integrations/ticimax/service";
import type { TicimaxWebhookPayload } from "@/lib/integrations/ticimax/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-ticimax-signature"))) {
    console.error("[Ticimax Webhook] İmza doğrulanamadı.");
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  try {
    console.log("[Ticimax Webhook] Payload", raw);
    const payload = JSON.parse(raw) as TicimaxWebhookPayload;
    await new TicimaxOrderService().handleWebhook(payload);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ticimax webhook işlenemedi.";
    console.error("[Ticimax Webhook] Hata", message);
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

function verifySignature(raw: string, signature: string | null) {
  const secret = process.env.TICIMAX_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const normalized = signature.replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(normalized);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
