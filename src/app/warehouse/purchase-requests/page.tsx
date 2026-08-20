import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseRequestForm } from "@/components/procurement/purchase-request-form";
import { procurementDate, procurementLabel, PURCHASE_PRIORITIES, PURCHASE_REQUEST_STATUSES } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WarehousePurchaseRequestsPage() {
  const [warehouses, suppliers, products, requests] = await Promise.all([
    prisma.warehouse.findMany({ where: { archivedAt: null, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { archivedAt: null, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      select: { id: true, name: true, sku: true, unit: true, purchasePrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseRequest.findMany({
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
          products={products.map((product) => ({ ...product, purchasePrice: product.purchasePrice || 0 }))}
        />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Son Talepler</h2>
          {requests.map((request) => (
            <Card key={request.id} className="shadow-none">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{procurementLabel(PURCHASE_REQUEST_STATUSES, request.status)}</Badge>
                    <Badge variant="secondary">{procurementLabel(PURCHASE_PRIORITIES, request.priority)}</Badge>
                  </div>
                  <p className="mt-2 font-semibold">{request.requestNumber} · {request.title}</p>
                  <p className="text-sm text-[#65705f]">
                    {request.warehouse.name} · {request.supplier?.name ?? "Tedarikçi satın alma tarafından seçilecek"} · Kalem: {request.items.length}
                    {request.purchaseOrder ? ` · Sipariş: ${request.purchaseOrder.orderNumber}` : ""}
                  </p>
                </div>
                <p className="text-sm text-[#65705f]">{procurementDate(request.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
          {!requests.length ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">Henüz satın alma talebi yok.</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
