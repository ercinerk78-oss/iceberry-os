import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { procurementDate, procurementLabel, PURCHASE_PRIORITIES, PURCHASE_REQUEST_STATUSES } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { status?: string; q?: string };

export default async function ProcurementRequestsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const requests = await prisma.purchaseRequest.findMany({
    where: {
      status: params.status || undefined,
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
  });

  return (
    <AppShell activeHref="/procurement/requests" eyebrow="Merkez satın alma" title="Bekleyen Satın Alma Talepleri">
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <form className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
            <input name="q" defaultValue={params.q} placeholder="Talep no, depo veya tedarikçi ara" className="h-10 min-w-64 rounded-lg border px-3" />
            <select name="status" defaultValue={params.status} className="h-10 rounded-lg border px-3">
              <option value="">Tüm durumlar</option>
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
                <tr>{["Talep", "Depo", "Tedarikçi", "Öncelik", "Durum", "İhtiyaç", "Kalem", "İşlem"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-4">
                      <b>{request.requestNumber}</b>
                      <p className="text-xs text-[#65705f]">{request.title}</p>
                    </td>
                    <td className="px-4 py-4">{request.warehouse.name}</td>
                    <td className="px-4 py-4">{request.supplier?.name ?? "Seçilecek"}</td>
                    <td className="px-4 py-4"><Badge variant="secondary">{procurementLabel(PURCHASE_PRIORITIES, request.priority)}</Badge></td>
                    <td className="px-4 py-4"><Badge variant="outline">{procurementLabel(PURCHASE_REQUEST_STATUSES, request.status)}</Badge></td>
                    <td className="px-4 py-4">{procurementDate(request.neededByDate)}</td>
                    <td className="px-4 py-4">{request.items.length}</td>
                    <td className="px-4 py-4">
                      {request.purchaseOrder ? (
                        <Button asChild size="sm" variant="outline"><Link href={`/procurement/orders/${request.purchaseOrder.id}`}>{request.purchaseOrder.orderNumber}</Link></Button>
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
