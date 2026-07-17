import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function GET(request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  await requirePermission("locations.view");
  const { fileName } = await params;
  const document = await prisma.candidateLocationDocument.findFirst({
    where: { fileName, archivedAt: null },
  });

  if (!document) return new NextResponse("Dosya bulunamadı.", { status: 404 });

  const data = await storage.read(document.filePath);
  const headers = new Headers();
  headers.set("content-type", document.mimeType);
  headers.set("content-length", String(document.fileSize));

  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  headers.set("content-disposition", `${disposition}; filename="${encodeURIComponent(document.originalFileName)}"`);

  return new NextResponse(new Uint8Array(data), { headers });
}
