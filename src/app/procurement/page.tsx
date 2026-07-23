import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShoppingCart } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { procurementDate, procurementLabel, procurementMoney, PURCHASE_ORDER_STATUSES } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [openOrders, delayedOrders, pendingReceipts, orders] = await Promise.all([
    prisma.purchaseOrder.count({ where: { status: { in: ["APPROVED", "SENT", "PARTIALLY_RECEIVED"] } } }),
    prisma.purchaseOrder.count({
      where: {
        status: { in: ["APPROVED", "SENT", "PARTIALLY_RECEIVED"] },
        expectedDeliveryDate: { lt: today },
      },
    }),
    prisma.goodsReceipt.count({ where: { status: { in: ["PENDING_MAPPING", "PENDING_RECEIPT", "IN_PROGRESS"] } } }),
    prisma.purchaseOrder.findMany({
      include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } }, items: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const monthlyTotal = orders.reduce((sum, order) => sum + Number(order.grandTotal), 0);

  return (
    <AppShell activeHref="/procurement" eyebrow="Merkez satın alma" title="Satın Alma">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-3xl text-sm text-[#65705f]">
            Tedarikçi siparişleri, bekleyen teslimatlar, alış faturaları ve mal kabul süreçleri tek merkezde takip edilir.
          </p>
          <Button asChild>
            <Link href="/procurement/orders/new">Yeni Satın Alma Siparişi</Link>
          </Button>
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Açık Satın Alma Siparişi" value={openOrders} icon={<ShoppingCart className="size-5" />} />
          <Metric title="Geciken Teslimat" value={delayedOrders} icon={<AlertTriangle className="size-5" />} />
          <Metric title="Bekleyen Mal Kabul" value={pendingReceipts} icon={<Clock className="size-5" />} />
          <Metric title="Son Sipariş Tutarı" value={procurementMoney(monthlyTotal)} icon={<CheckCircle2 className="size-5" />} />
        </section>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Son Satın Alma Siparişleri</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/procurement/orders">Tümünü Gör</Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                <tr>{["Sipariş", "Tedarikçi", "Depo", "Durum", "Teslim", "Tutar", "Kalem"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-3 py-3 font-semibold"><Link href={`/procurement/orders/${order.id}`}>{order.orderNumber}</Link></td>
                    <td className="px-3 py-3">{order.supplier.name}</td>
                    <td className="px-3 py-3">{order.warehouse.name}</td>
                    <td className="px-3 py-3"><Badge variant="outline">{procurementLabel(PURCHASE_ORDER_STATUSES, order.status)}</Badge></td>
                    <td className="px-3 py-3">{procurementDate(order.expectedDeliveryDate)}</td>
                    <td className="px-3 py-3">{procurementMoney(order.grandTotal, order.currency)}</td>
                    <td className="px-3 py-3">{order.items.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">Henüz satın alma siparişi yok.</p> : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon }: { title: string; value: number | string; icon: ReactNode }) {
  return (
    <Card className="flex items-center justify-between p-4 shadow-none">
      <div>
        <p className="text-sm text-[#65705f]">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </div>
      <div className="rounded-lg bg-[#edf7e7] p-3 text-[#497b2f]">{icon}</div>
    </Card>
  );
}
