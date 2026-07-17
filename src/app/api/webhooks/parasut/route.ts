import { createHmac, timingSafeEqual } from "node:crypto";

import { ParasutInvoiceService } from "@/lib/integrations/parasut/invoice-service";
import type { ParasutInvoicePayload } from "@/lib/integrations/parasut/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-parasut-signature"))) {
    console.error("[Paraşüt Webhook] İmza doğrulanamadı.");
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  try {
    console.log("[Paraşüt Webhook] Payload", raw);
    const payload = JSON.parse(raw) as { eventId?: string; invoiceId?: string; invoice?: ParasutInvoicePayload; version?: string };
    await new ParasutInvoiceService().handleInvoiceWebhook(payload);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paraşüt webhook işlenemedi.";
    console.error("[Paraşüt Webhook] Hata", message);
    return Response.json({ ok: false, error: message }, { status: 200 });
  }
}

function verifySignature(raw: string, signature: string | null) {
  const secret = process.env.PARASUT_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const normalized = signature.replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(normalized);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
