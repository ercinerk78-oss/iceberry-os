import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { purchaseRequestDraftWarning } from "@/lib/purchase-request-drafts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseRequestForm } from "@/components/procurement/purchase-request-form";
import { PurchaseRequestCancelForm } from "@/components/procurement/purchase-request-cancel-form";
import { canCancelPurchaseRequest } from "@/lib/purchase-request-cancellation";
import { procurementDate, procurementLabel, PURCHASE_PRIORITIES, PURCHASE_REQUEST_STATUSES } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WarehousePurchaseRequestsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const cancelled = (await searchParams).view === "cancelled";
  const [warehouses, suppliers, products, requests] = await Promise.all([
    prisma.warehouse.findMany({ where: { archivedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { archivedAt: null, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        purchasePrice: true,
        vatRate: true,
        stocks: { select: { warehouseId: true, quantity: true } },
        supplierProducts: {
          where: { isActive: true },
          select: { unitPrice: true, lastQuotedAt: true, isPreferred: true },
          orderBy: [{ isPreferred: "desc" }, { lastQuotedAt: "desc" }, { updatedAt: "desc" }],
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseRequest.findMany({
      where: { status: cancelled ? "CANCELLED" : { not: "CANCELLED" } },
      include: {
        warehouse: { select: { name: true } },
        supplier: { select: { name: true } },
        items: { select: { id: true, requestedQuantity: true } },
        purchaseOrder: { select: { orderNumber: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  return (
    <AppShell activeHref="/warehouse/purchase-requests" eyebrow="Merkez depo" title="Satın Alma Talepleri">
      <div className="space-y-5">
        <PurchaseRequestForm
          warehouses={warehouses}
          suppliers={suppliers}
          products={products.map((product) => ({
            ...product,
            purchasePrice: Number(product.purchasePrice ?? 0),
            supplierProducts: product.supplierProducts.map((mapping) => ({
              unitPrice: mapping.unitPrice == null ? null : Number(mapping.unitPrice),
              lastQuotedAt: mapping.lastQuotedAt?.toISOString() ?? null,
              isPreferred: mapping.isPreferred,
            })),
          }))}
        />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{cancelled ? "Kaldırılan Talepler" : "Son Talepler"}</h2>
            <Button asChild variant="outline" size="sm"><Link href={cancelled ? "/warehouse/purchase-requests" : "/warehouse/purchase-requests?view=cancelled"}>{cancelled ? "Son Taleplere Dön" : "Kaldırılan Talepler"}</Link></Button>
          </div>
          {requests.map((request) => (
            <Card key={request.id} className={purchaseRequestDraftWarning(request.status, request.createdAt) ? "border-red-300 bg-red-50 shadow-none" : "shadow-none"}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{procurementLabel(PURCHASE_REQUEST_STATUSES, request.status)}</Badge>
                    <Badge variant="secondary">{procurementLabel(PURCHASE_PRIORITIES, request.priority)}</Badge>
                  </div>
                  <p className="mt-2 font-semibold">{request.requestNumber} · {request.title}</p>
                  {purchaseRequestDraftWarning(request.status, request.createdAt) ? <p role="status" className="mt-2 text-sm font-semibold text-red-700">{purchaseRequestDraftWarning(request.status, request.createdAt)}</p> : null}
                  <p className="text-sm text-[#65705f]">
                    {request.warehouse.name} · {request.supplier?.name ?? "Tedarikçi satın alma tarafından seçilecek"} · Kalem: {request.items.length}
                    {request.purchaseOrder ? ` · Sipariş: ${request.purchaseOrder.orderNumber}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#65705f]">
                    Sipariş: {procurementDate(request.orderDate)} · İhtiyaç: {procurementDate(request.neededByDate)} · Termin: {procurementDate(request.termDate)}
                  </p>
                </div>
                <p className="text-sm text-[#65705f]">{procurementDate(request.createdAt)}</p>
                {["DRAFT", "SUBMITTED"].includes(request.status) && !request.purchaseOrder ? <Button asChild variant="outline"><Link href={`/warehouse/purchase-requests/${request.id}`}>{request.status === "DRAFT" ? "Düzenle / Onaya Gönder" : "Düzenle"}</Link></Button> : null}
                {canCancelPurchaseRequest(request.status, Boolean(request.purchaseOrder)) ? <PurchaseRequestCancelForm requestId={request.id} requestNumber={request.requestNumber} /> : null}
              </CardContent>
            </Card>
          ))}
          {!requests.length ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">{cancelled ? "Kaldırılan talep yok." : "Henüz satın alma talebi yok."}</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
