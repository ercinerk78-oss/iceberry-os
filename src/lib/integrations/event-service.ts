import { Prisma } from "@prisma/client";

import { INTEGRATION_ERROR_CODES, INTEGRATION_STATUSES } from "@/lib/integrations/constants";
import { stringifyPayload } from "@/lib/integrations/payload";
import { prisma } from "@/lib/prisma";

const retryDelaysMinutes = [1, 5, 15, 60];

export type IntegrationEventInput = {
  provider: string;
  eventType: string;
  direction: string;
  externalEventId?: string;
  externalEntityId?: string;
  internalEntityType?: string;
  internalEntityId?: string;
  idempotencyKey: string;
  requestPayload?: unknown;
};

export async function receiveIntegrationEvent(input: IntegrationEventInput) {
  try {
    return await prisma.integrationEvent.create({
      data: {
        provider: input.provider,
        eventType: input.eventType,
        direction: input.direction,
        externalEventId: input.externalEventId,
        externalEntityId: input.externalEntityId,
        internalEntityType: input.internalEntityType,
        internalEntityId: input.internalEntityId,
        idempotencyKey: input.idempotencyKey,
        requestPayload: input.requestPayload === undefined ? undefined : stringifyPayload(input.requestPayload),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.integrationEvent.findUniqueOrThrow({ where: { idempotencyKey: input.idempotencyKey } });
    }
    throw error;
  }
}

export async function markEventProcessing(id: string) {
  return prisma.integrationEvent.update({
    where: { id },
    data: { status: INTEGRATION_STATUSES.PROCESSING, attemptCount: { increment: 1 } },
  });
}

export async function markEventSuccess(id: string, input: { internalEntityType?: string; internalEntityId?: string; responsePayload?: unknown }) {
  return prisma.integrationEvent.update({
    where: { id },
    data: {
      status: INTEGRATION_STATUSES.SUCCESS,
      internalEntityType: input.internalEntityType,
      internalEntityId: input.internalEntityId,
      responsePayload: input.responsePayload === undefined ? undefined : stringifyPayload(input.responsePayload),
      errorCode: null,
      errorMessage: null,
      nextRetryAt: null,
      processedAt: new Date(),
    },
  });
}

export async function markEventManualReview(id: string, errorCode: string, message: string, responsePayload?: unknown) {
  return prisma.integrationEvent.update({
    where: { id },
    data: {
      status: INTEGRATION_STATUSES.MANUAL_REVIEW,
      errorCode,
      errorMessage: message,
      responsePayload: responsePayload === undefined ? undefined : stringifyPayload(responsePayload),
      processedAt: new Date(),
    },
  });
}

export async function markEventFailure(id: string, errorCode: string, message: string, responsePayload?: unknown) {
  const event = await prisma.integrationEvent.findUnique({ where: { id }, select: { attemptCount: true } });
  const attemptCount = event?.attemptCount ?? 0;
  const retryDelay = retryDelaysMinutes[attemptCount - 1];

  return prisma.integrationEvent.update({
    where: { id },
    data: {
      status: retryDelay ? INTEGRATION_STATUSES.RETRY_PENDING : INTEGRATION_STATUSES.FAILED,
      errorCode,
      errorMessage: message,
      responsePayload: responsePayload === undefined ? undefined : stringifyPayload(responsePayload),
      nextRetryAt: retryDelay ? new Date(Date.now() + retryDelay * 60_000) : null,
      processedAt: retryDelay ? null : new Date(),
    },
  });
}

export function classifyIntegrationError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("unauthorized") || message.includes("token")) return INTEGRATION_ERROR_CODES.AUTHENTICATION_ERROR;
    if (message.includes("rate")) return INTEGRATION_ERROR_CODES.RATE_LIMIT;
    if (message.includes("timeout")) return INTEGRATION_ERROR_CODES.TIMEOUT;
    if (message.includes("network") || message.includes("fetch")) return INTEGRATION_ERROR_CODES.NETWORK_ERROR;
    if (message.includes("mapping")) return INTEGRATION_ERROR_CODES.PRODUCT_MAPPING_ERROR;
    return INTEGRATION_ERROR_CODES.PROVIDER_ERROR;
  }

  return INTEGRATION_ERROR_CODES.UNKNOWN_ERROR;
}
