import { NextRequest } from "next/server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("academy.view");
  const { id } = await params;
  const media = await prisma.academyMediaAsset.findFirst({ where: { id, archivedAt: null } });
  if (!media) return new Response("Eğitim içeriği bulunamadı.", { status: 404 });

  if (media.sourceType === "YOUTUBE" || media.sourceType === "VIMEO") {
    return Response.redirect(media.fileUrl || "/", 302);
  }

  if (!media.filePath) return new Response("Dosya bağlantısı bulunamadı.", { status: 404 });

  try {
    const data = await storage.read(media.filePath);
    const download = request.nextUrl.searchParams.get("download") === "1";
    const originalName = media.originalFileName || media.fileName || `${media.title}.bin`;
    const safeName = originalName.replace(/[\r\n"]/g, "_");

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": media.mimeType || "application/octet-stream",
        "Content-Length": media.fileSize ? String(media.fileSize) : String(data.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[academy] media read failed", { id: media.id, error });
    return new Response("Fiziksel dosya bulunamadı.", { status: 404 });
  }
}
