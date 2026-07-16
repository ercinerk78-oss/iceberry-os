import { NextRequest } from "next/server";

import { MetaLeadService, MetaWebhookError } from "@/lib/meta/meta-lead-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const service = new MetaLeadService();

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const verifyToken = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  console.log("[Meta Webhook GET]", {
    "hub.mode": mode,
    "hub.verify_token": verifyToken,
    "hub.challenge": challenge,
    env: "META_WEBHOOK_VERIFY_TOKEN",
  });

  try {
    const challenge = service.verifyWebhookChallenge(request.nextUrl.searchParams);

    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook doğrulaması başarısız.";
    const status = error instanceof MetaWebhookError ? error.status : 403;

    await service.logWebhook({ payload: Object.fromEntries(request.nextUrl.searchParams), result: "ERROR", error: message });

    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const result = await service.processWebhook(raw, request.headers.get("x-hub-signature-256"));

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta webhook işlenemedi.";
    const status = error instanceof MetaWebhookError ? error.status : 500;

    return Response.json({ error: message }, { status });
  }
}
