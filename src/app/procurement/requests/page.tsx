import Link from "next/link";
import { PurchaseRequestCancelForm } from "@/components/procurement/purchase-request-cancel-form";
import { canCancelPurchaseRequest } from "@/lib/purchase-request-cancellation";
import { purchaseRequestDraftWarning } from "@/lib/purchase-request-drafts";

import { AppShell } from "@/components/app-shell";
import { PurchaseRequestForm } from "@/components/procurement/purchase-request-form";
import { PurchaseRequestSupplierForm } from "@/components/procurement/purchase-request-supplier-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { procurementDate, procurementLabel, PURCHASE_PRIORITIES, PURCHASE_REQUEST_STATUSES } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { status?: string; q?: string };

export default async function ProcurementRequestsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
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
      where: {
        status: params.status || { not: "CANCELLED" },
        OR: params.q
          ? [
            { requestNumber: { contains: params.q } },
            { title: { contains: params.q } },
            { warehouse: { name: { contains: params.q } } },
            { supplier: { name: { contains: params.q } } },
          ]
          : undefined,
      },
      include: {
        warehouse: { select: { name: true } },
        supplier: { select: { name: true } },
        items: { orderBy: { createdAt: "asc" } },
        purchaseOrder: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
  ]);

  return (
    <AppShell activeHref="/procurement/requests" eyebrow="Merkez satın alma" title="Bekleyen Satın Alma Talepleri">
      <div className="space-y-4">
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
          title="Satın Alma Talebi Oluştur"
        />

        <div className="flex flex-wrap justify-between gap-3">
          <form className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
            <input name="q" defaultValue={params.q} placeholder="Talep no, depo veya tedarikçi ara" className="h-10 min-w-64 rounded-lg border px-3" />
            <select name="status" defaultValue={params.status} className="h-10 rounded-lg border px-3">
              <option value="">Kaldırılanlar Hariç Tüm Durumlar</option>
              {PURCHASE_REQUEST_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Button>Filtrele</Button>
          </form>
          <Button asChild variant="outline">
            <Link href="/procurement/orders/new">Talep Olmadan Sipariş Oluştur</Link>
          </Button>
        </div>

        <Card className="overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                <tr>{["Talep", "Depo", "Tedarikçi", "Öncelik", "Durum", "Tarihler", "Kalem", "İşlem"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((request) => (
                  <tr key={request.id} className={purchaseRequestDraftWarning(request.status, request.createdAt) ? "bg-red-50" : undefined}>
                    <td className="px-4 py-4">
                      <b>{request.requestNumber}</b>
                      <p className="text-xs text-[#65705f]">{request.title}</p>
                      {purchaseRequestDraftWarning(request.status, request.createdAt) ? <p className="mt-1 text-xs font-semibold text-red-700">{purchaseRequestDraftWarning(request.status, request.createdAt)}</p> : null}
                    </td>
                    <td className="px-4 py-4">{request.warehouse.name}</td>
                    <td className="px-4 py-4">
                      {!request.purchaseOrder && !["CANCELLED", "REJECTED", "CONVERTED"].includes(request.status) ? (
                        <PurchaseRequestSupplierForm requestId={request.id} supplierId={request.supplierId} suppliers={suppliers.some((supplier) => supplier.id === request.supplierId) || !request.supplierId ? suppliers : [{ id: request.supplierId, name: request.supplier?.name ?? "Mevcut tedarikçi" }, ...suppliers]} />
                      ) : request.supplier?.name ?? "DİĞER / BELİRSİZ"}
                    </td>
                    <td className="px-4 py-4"><Badge variant="secondary">{procurementLabel(PURCHASE_PRIORITIES, request.priority)}</Badge></td>
                    <td className="px-4 py-4"><Badge variant="outline">{procurementLabel(PURCHASE_REQUEST_STATUSES, request.status)}</Badge></td>
                    <td className="px-4 py-4 text-xs text-[#65705f]">
                      <p><span className="font-medium text-[#111b12]">Sipariş:</span> {procurementDate(request.orderDate)}</p>
                      <p><span className="font-medium text-[#111b12]">İhtiyaç:</span> {procurementDate(request.neededByDate)}</p>
                      <p><span className="font-medium text-[#111b12]">Termin:</span> {procurementDate(request.termDate)}</p>
                    </td>
                    <td className="px-4 py-4">{request.items.length}</td>
                    <td className="px-4 py-4">
                      {canCancelPurchaseRequest(request.status, Boolean(request.purchaseOrder)) ? <div className="mb-2"><PurchaseRequestCancelForm requestId={request.id} requestNumber={request.requestNumber} /></div> : null}
                      {request.status === "SUBMITTED" && !request.purchaseOrder ? <Button asChild size="sm" variant="outline" className="mb-2"><Link href={`/procurement/requests/${request.id}`}>Düzenle</Link></Button> : null}
                      {request.purchaseOrder ? (
                        <Button asChild size="sm" variant="outline"><Link href={`/procurement/orders/${request.purchaseOrder.id}`}>{request.purchaseOrder.orderNumber}</Link></Button>
                      ) : request.status === "DRAFT" ? (
                        <Button asChild size="sm" variant="outline"><Link href={`/procurement/requests/${request.id}`}>Düzenle / Onaya Gönder</Link></Button>
                      ) : ["CANCELLED", "REJECTED", "CONVERTED"].includes(request.status) ? (
                        <span className="text-xs text-[#65705f]">Kapalı</span>
                      ) : (
                        <Button asChild size="sm"><Link href={`/procurement/orders/new?requestId=${request.id}`}>Siparişe Dönüştür</Link></Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!requests.length ? (
                  <tr><td colSpan={8} className="p-12 text-center text-[#65705f]">Filtreye uygun satın alma talebi yok.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
