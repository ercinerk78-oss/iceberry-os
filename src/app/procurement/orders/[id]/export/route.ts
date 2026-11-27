import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { purchaseOrderExcel } from "@/lib/purchase-order-excel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("procurement");
  const url = new URL(request.url);
  if (url.searchParams.has("format") && url.searchParams.get("format") !== "excel") {
    url.searchParams.set("format", "excel");
    return Response.redirect(url, 307);
  }
  const { id } = await params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: { select: { name: true, address: true } },
      items: { orderBy: { createdAt: "asc" } },
      approvals: { where: { comment: { not: null } }, orderBy: { actedAt: "desc" }, take: 3 },
    },
  });
  if (!order) notFound();
  const workbook = await purchaseOrderExcel(order);
  const filename = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
