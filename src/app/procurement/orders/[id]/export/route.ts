import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { requirePermission } from "@/lib/auth";
import { procurementDate, procurementMoney } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";
import { purchaseOrderExcel } from "@/lib/purchase-order-excel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("procurement");
  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "word" ? "word" : "excel";
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: { select: { name: true, address: true } },
      items: { orderBy: { createdAt: "asc" } },
      approvals: {
        where: { comment: { not: null } },
        orderBy: { actedAt: "desc" },
        take: 3,
      },
    },
  });

  if (!order) notFound();

  if (format === "word") {
    const html = purchaseOrderHtml(order);
    return new Response(html, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${order.orderNumber}.doc"`,
      },
    });
  }

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

type ExportOrder = Prisma.PurchaseOrderGetPayload<{
  include: {
    supplier: true;
    warehouse: { select: { name: true } };
    items: true;
    approvals: true;
  };
}>;

function purchaseOrderHtml(order: ExportOrder) {
  const notes = order.approvals.map((approval) => `
    <p><strong>${escapeHtml(procurementDate(approval.actedAt))}</strong> - ${escapeHtml(approval.comment ?? "")}</p>
  `).join("");

  const itemRows = order.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.sku)}</td>
      <td>${item.orderedQuantity}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(procurementMoney(item.unitPrice, order.currency))}</td>
      <td>%${escapeHtml(item.vatRate.toString())}</td>
      <td>%${escapeHtml(item.discountRate.toString())}</td>
      <td>${escapeHtml(procurementMoney(item.lineTotal, order.currency))}</td>
      <td>${escapeHtml(item.notes ?? "")}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(order.orderNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111b12; }
    h1 { font-size: 22px; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th, td { border: 1px solid #dfe4dc; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f8faf6; }
    .meta { margin: 4px 0; }
    .total { margin-top: 16px; font-size: 16px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Satın Alma Siparişi - ${escapeHtml(order.orderNumber)}</h1>
  <p class="meta"><strong>Tedarikçi:</strong> ${escapeHtml(order.supplier.name)}</p>
  <p class="meta"><strong>Depo:</strong> ${escapeHtml(order.warehouse.name)}</p>
  <p class="meta"><strong>Sipariş Tarihi:</strong> ${escapeHtml(procurementDate(order.orderDate))}</p>
  <p class="meta"><strong>Beklenen Teslim:</strong> ${escapeHtml(procurementDate(order.expectedDeliveryDate))}</p>
  <p class="meta"><strong>Not:</strong> ${escapeHtml(order.notes ?? "-")}</p>
  <table>
    <thead>
      <tr><th>Ürün</th><th>SKU</th><th>Miktar</th><th>Birim</th><th>Birim Fiyat</th><th>KDV</th><th>İskonto</th><th>Toplam</th><th>Not</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <p class="total">Genel Toplam: ${escapeHtml(procurementMoney(order.grandTotal, order.currency))}</p>
  <h2>Son Notlar</h2>
  ${notes || "<p>Not yok.</p>"}
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
