import { NextRequest } from "next/server";

import { WhatsAppWebhookError, WhatsAppWebhookService } from "@/lib/whatsapp/whatsapp-webhook-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const service = new WhatsAppWebhookService();

export async function GET(request: NextRequest) {
  try {
    const challenge = service.verifyWebhookChallenge(request.nextUrl.searchParams);

    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp webhook doğrulaması başarısız.";
    const status = error instanceof WhatsAppWebhookError ? error.status : 403;

    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const result = await service.processWebhook(raw, request.headers.get("x-hub-signature-256"));

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp webhook işlenemedi.";
    const status = error instanceof WhatsAppWebhookError ? error.status : 500;

    return Response.json({ error: message }, { status });
  }
}
