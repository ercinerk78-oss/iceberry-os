import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { procurementDate, procurementMoney } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PurchaseReportsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [orders, openOrders, delayedOrders, partialOrders] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: {
        supplier: { select: { name: true } },
        items: { select: { productName: true, sku: true, orderedQuantity: true, receivedQuantity: true, lineTotal: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.purchaseOrder.findMany({
      where: { status: { in: ["APPROVED", "SENT", "PARTIALLY_RECEIVED"] } },
      include: { supplier: { select: { name: true } } },
      orderBy: { expectedDeliveryDate: "asc" },
      take: 20,
    }),
    prisma.purchaseOrder.findMany({
      where: { status: { in: ["APPROVED", "SENT", "PARTIALLY_RECEIVED"] }, expectedDeliveryDate: { lt: today } },
      include: { supplier: { select: { name: true } } },
      orderBy: { expectedDeliveryDate: "asc" },
      take: 20,
    }),
    prisma.purchaseOrder.findMany({
      where: { status: "PARTIALLY_RECEIVED" },
      include: { supplier: { select: { name: true } }, items: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const supplierTotals = Array.from(groupTotals(orders.map((order) => ({
    key: order.supplier.name,
    amount: Number(order.grandTotal),
  }))).entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const productTotals = Array.from(groupTotals(orders.flatMap((order) => order.items.map((item) => ({
    key: `${item.productName} (${item.sku})`,
    amount: Number(item.lineTotal),
  })))).entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const totalAmount = orders.reduce((sum, order) => sum + Number(order.grandTotal), 0);

  return (
    <AppShell activeHref="/procurement/reports" eyebrow="Merkez satın alma" title="Satın Alma Raporları">
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-4">
          <Metric title="Toplam Satın Alma Tutarı" value={procurementMoney(totalAmount)} />
          <Metric title="Açık Sipariş" value={openOrders.length} />
          <Metric title="Geciken Teslimat" value={delayedOrders.length} />
          <Metric title="Kısmi Teslimat" value={partialOrders.length} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ReportCard title="Tedarikçi Bazlı Satın Alma" rows={supplierTotals} />
          <ReportCard title="Ürün Bazlı Satın Alma" rows={productTotals} />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <StatusList title="Açık Satın Alma Siparişleri" rows={openOrders.map((order) => ({
            id: order.id,
            title: order.orderNumber,
            subtitle: `${order.supplier.name} · ${procurementDate(order.expectedDeliveryDate)}`,
            badge: order.status,
          }))} />
          <StatusList title="Geciken Teslimatlar" rows={delayedOrders.map((order) => ({
            id: order.id,
            title: order.orderNumber,
            subtitle: `${order.supplier.name} · ${procurementDate(order.expectedDeliveryDate)}`,
            badge: order.status,
          }))} />
          <StatusList title="Kısmi Teslimatlar" rows={partialOrders.map((order) => {
            const ordered = order.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
            const received = order.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
            return {
              id: order.id,
              title: order.orderNumber,
              subtitle: `${order.supplier.name} · ${received}/${ordered} teslim`,
              badge: order.status,
            };
          })} />
        </section>
      </div>
    </AppShell>
  );
}

function groupTotals(rows: { key: string; amount: number }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.key, (totals.get(row.key) ?? 0) + row.amount);
  return totals;
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <p className="text-sm text-[#65705f]">{title}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReportCard({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card className="shadow-none">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, amount]) => (
          <div key={label} className="flex justify-between gap-3 border-b pb-2 text-sm">
            <span>{label}</span>
            <b>{procurementMoney(amount)}</b>
          </div>
        ))}
        {!rows.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Rapor için veri yok.</p> : null}
      </CardContent>
    </Card>
  );
}

function StatusList({ title, rows }: { title: string; rows: { id: string; title: string; subtitle: string; badge: string }[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border p-3 text-sm">
            <div className="flex justify-between gap-2"><b>{row.title}</b><Badge variant="outline">{row.badge}</Badge></div>
            <p className="text-[#65705f]">{row.subtitle}</p>
          </div>
        ))}
        {!rows.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Kayıt yok.</p> : null}
      </CardContent>
    </Card>
  );
}
