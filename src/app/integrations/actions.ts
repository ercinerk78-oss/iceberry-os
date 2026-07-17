"use server";

import { revalidatePath } from "next/cache";

import { audit, requirePermission } from "@/lib/auth";
import { INTEGRATION_STATUSES } from "@/lib/integrations/constants";
import { classifyIntegrationError, markEventFailure, markEventProcessing } from "@/lib/integrations/event-service";
import { ParasutClient } from "@/lib/integrations/parasut/client";
import { ParasutInvoiceService } from "@/lib/integrations/parasut/invoice-service";
import { TicimaxClient } from "@/lib/integrations/ticimax/client";
import { TicimaxOrderService } from "@/lib/integrations/ticimax/service";
import { prisma } from "@/lib/prisma";

function refresh() {
  revalidatePath("/integrations");
  revalidatePath("/settings/integrations");
}

export async function testConnection(provider: string) {
  const user = await requirePermission("integrations");
  const client = provider === "TICIMAX" ? new TicimaxClient() : new ParasutClient();
  try {
    await client.testConnection();
    await prisma.integrationConnection.upsert({
      where: { provider_environment_name: { provider, environment: "PRODUCTION", name: provider } },
      create: { provider, environment: "PRODUCTION", name: provider, status: "CONNECTED", isActive: true, lastSuccessfulSyncAt: new Date(), updatedById: user.id },
      update: { status: "CONNECTED", isActive: true, lastSuccessfulSyncAt: new Date(), lastErrorMessage: null, updatedById: user.id },
    });
    await audit("INTEGRATION_CONNECTED", "IntegrationConnection", provider, `${provider} bağlantı testi başarılı.`, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bağlantı testi başarısız.";
    await prisma.integrationConnection.upsert({
      where: { provider_environment_name: { provider, environment: "PRODUCTION", name: provider } },
      create: { provider, environment: "PRODUCTION", name: provider, status: "ERROR", isActive: false, lastFailedSyncAt: new Date(), lastErrorMessage: message, updatedById: user.id },
      update: { status: "ERROR", lastFailedSyncAt: new Date(), lastErrorMessage: message, updatedById: user.id },
    });
    await audit("INTEGRATION_CONNECTION_ERROR", "IntegrationConnection", provider, `${provider} bağlantı testi başarısız.`, user.id);
  }
  refresh();
}

export async function setIntegrationActive(provider: string, active: boolean) {
  const user = await requirePermission("integrations");
  await prisma.integrationConnection.upsert({
    where: { provider_environment_name: { provider, environment: "PRODUCTION", name: provider } },
    create: { provider, environment: "PRODUCTION", name: provider, status: active ? "CONNECTED" : "PAUSED", isActive: active, updatedById: user.id },
    update: { status: active ? "CONNECTED" : "PAUSED", isActive: active, updatedById: user.id },
  });
  await audit(active ? "INTEGRATION_RESUMED" : "INTEGRATION_PAUSED", "IntegrationConnection", provider, `${provider} ${active ? "aktifleştirildi" : "durduruldu"}.`, user.id);
  refresh();
}

export async function retryIntegrationEvent(id: string) {
  const user = await requirePermission("integrations");
  const event = await prisma.integrationEvent.findUnique({ where: { id } });
  if (!event) return;
  await markEventProcessing(id);
  try {
    if (event.provider === "TICIMAX" && event.requestPayload) {
      await new TicimaxOrderService().handleWebhook(JSON.parse(event.requestPayload));
    } else if (event.provider === "PARASUT" && event.requestPayload) {
      await new ParasutInvoiceService().handleInvoiceWebhook(JSON.parse(event.requestPayload));
    } else {
      await prisma.integrationEvent.update({ where: { id }, data: { status: INTEGRATION_STATUSES.MANUAL_REVIEW, errorMessage: "Yeniden deneme için payload bulunamadı." } });
    }
    await audit("INTEGRATION_RETRY_TRIGGERED", "IntegrationEvent", id, "Entegrasyon işlemi yeniden denendi.", user.id);
  } catch (error) {
    await markEventFailure(id, classifyIntegrationError(error), error instanceof Error ? error.message : "Yeniden deneme başarısız.");
  }
  refresh();
}

export async function ignoreIntegrationEvent(id: string) {
  const user = await requirePermission("integrations");
  await prisma.integrationEvent.update({ where: { id }, data: { status: INTEGRATION_STATUSES.IGNORED, processedAt: new Date() } });
  await audit("INTEGRATION_EVENT_IGNORED", "IntegrationEvent", id, "Entegrasyon işlemi yok sayıldı.", user.id);
  refresh();
}
