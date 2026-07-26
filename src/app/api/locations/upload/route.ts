import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  locationId: z.string().min(1),
  documentType: z.string().min(1),
});

const allowedContentTypes = ["application/pdf", "image/jpeg", "image/png"];
const maximumSizeInBytes = 25 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await requirePermission("locations.upload_document");
        const parsed = payloadSchema.safeParse(JSON.parse(clientPayload || "{}"));
        if (!parsed.success) throw new Error("Yükleme bilgileri doğrulanamadı.");

        const location = await prisma.candidateLocation.findFirst({
          where: { id: parsed.data.locationId, archivedAt: null },
          select: { id: true },
        });
        if (!location) throw new Error("Lokasyon bulunamadı.");
        if (!pathname.startsWith(`locations/${parsed.data.locationId}/`)) throw new Error("Geçersiz dosya yolu.");

        return {
          allowedContentTypes,
          maximumSizeInBytes,
          addRandomSuffix: true,
          tokenPayload: clientPayload,
        };
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[locations] blob upload token failed", error);
    return NextResponse.json({ error: "Dosya yükleme yetkisi oluşturulamadı." }, { status: 400 });
  }
}
