import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { procurementDate, procurementLabel, procurementMoney, PURCHASE_ORDER_STATUSES } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { q?: string; status?: string; supplierId?: string };

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [suppliers, orders] = await Promise.all([
    prisma.supplier.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({
      where: {
        status: params.status || undefined,
        supplierId: params.supplierId || undefined,
        OR: params.q
          ? [
              { orderNumber: { contains: params.q } },
              { supplier: { name: { contains: params.q } } },
              { externalReference: { contains: params.q } },
            ]
          : undefined,
      },
      include: {
        supplier: { select: { name: true } },
        warehouse: { select: { name: true } },
        items: { select: { orderedQuantity: true, receivedQuantity: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);

  return (
    <AppShell activeHref="/procurement/orders" eyebrow="Merkez satın alma" title="Satın Alma Siparişleri">
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <form className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
            <input name="q" defaultValue={params.q} placeholder="PO no, tedarikçi veya referans ara" className="h-10 min-w-64 rounded-lg border px-3" />
            <select name="status" defaultValue={params.status} className="h-10 rounded-lg border px-3">
              <option value="">Tüm durumlar</option>
              {PURCHASE_ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="supplierId" defaultValue={params.supplierId} className="h-10 rounded-lg border px-3">
              <option value="">Tüm tedarikçiler</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
            <Button>Filtrele</Button>
          </form>
          <Button asChild>
            <Link href="/procurement/orders/new">Yeni Sipariş</Link>
          </Button>
        </div>

        <Card className="overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                <tr>{["Sipariş", "Tedarikçi", "Depo", "Durum", "Teslim", "Teslimat", "Fatura", "Ödeme", "Tutar", "İşlem"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => {
                  const ordered = order.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
                  const received = order.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
                  return (
                    <tr key={order.id}>
                      <td className="px-4 py-4 font-semibold">{order.orderNumber}</td>
                      <td className="px-4 py-4">{order.supplier.name}</td>
                      <td className="px-4 py-4">{order.warehouse.name}</td>
                      <td className="px-4 py-4"><Badge variant="outline">{procurementLabel(PURCHASE_ORDER_STATUSES, order.status)}</Badge></td>
                      <td className="px-4 py-4">{procurementDate(order.expectedDeliveryDate)}</td>
                      <td className="px-4 py-4">{received} / {ordered}</td>
                      <td className="px-4 py-4">{order.invoiceStatus}</td>
                      <td className="px-4 py-4">{order.paymentStatus}</td>
                      <td className="px-4 py-4">{procurementMoney(order.grandTotal, order.currency)}</td>
                      <td className="px-4 py-4"><Button asChild size="sm" variant="outline"><Link href={`/procurement/orders/${order.id}`}>İncele</Link></Button></td>
                    </tr>
                  );
                })}
                {!orders.length ? (
                  <tr><td colSpan={10} className="p-12 text-center text-[#65705f]">Filtreye uygun satın alma siparişi yok.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
