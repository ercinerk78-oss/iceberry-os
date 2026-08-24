import { NextRequest } from "next/server";

import { requireBranchOperationAccess } from "@/lib/operations/access";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evidence = await prisma.auditEvidence.findUnique({
    where: { id },
    select: {
      documentId: true,
      audit: { select: { branchId: true } },
    },
  });

  if (!evidence?.documentId) return new Response("Fotoğraf bulunamadı.", { status: 404 });
  await requireBranchOperationAccess(evidence.audit.branchId);

  const document = await prisma.document.findUnique({ where: { id: evidence.documentId } });
  if (!document) return new Response("Fotoğraf bulunamadı.", { status: 404 });

  try {
    const data = await storage.read(document.filePath);
    const download = request.nextUrl.searchParams.get("download") === "1";
    const safeName = document.originalFileName.replace(/[\r\n"]/g, "_");

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(document.fileSize),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(document.originalFileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Fiziksel fotoğraf bulunamadı.", { status: 404 });
  }
}
