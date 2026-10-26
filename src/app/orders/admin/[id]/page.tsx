import { notFound } from "next/navigation";

import { orderCommand } from "@/app/orders/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { backorderReasonLabel, backorderStatusLabel } from "@/lib/backorders";
import { prisma } from "@/lib/prisma";
import { dateTime, money, ORDER_STATUSES, warehouseLabel } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function OrderAdminDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.franchiseOrder.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      invoiceStatus: true,
      parasutInvoiceId: true,
      requestedDeliveryDate: true,
      grandTotal: true,
      currency: true,
      franchisee: { select: { companyName: true } },
      branch: { select: { branchName: true } },
      warehouse: { select: { name: true } },
      items: {
        select: {
          id: true,
          productName: true,
          sku: true,
          quantity: true,
          unit: true,
          lineTotal: true,
        },
      },
      activities: {
        select: { id: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      backorders: {
        include: { product: { select: { name: true, sku: true } }, shipment: { select: { shipmentNumber: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) notFound();

  return (
    <AppShell activeHref="/orders/admin" eyebrow="Sipariş inceleme" title={order.orderNumber}>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="shadow-none">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <Badge>{warehouseLabel(ORDER_STATUSES, order.status)}</Badge>
                <p className="mt-2 font-semibold">
                  {order.franchisee.companyName} · {order.branch?.branchName ?? "Genel sipariş"}
                </p>
                <p className="text-sm text-[#65705f]">
                  {order.warehouse.name} · Teslim {dateTime(order.requestedDeliveryDate)}
                </p>
              </div>
              <p className="text-2xl font-semibold">{money(order.grandTotal, order.currency)}</p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Eksik Sevk / Borçlu Ürünler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.backorders.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <b>{item.product.name}</b>
                    <Badge>{backorderStatusLabel(item.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[#65705f]">
                    {item.shipment?.shipmentNumber ?? "Sevkiyat yok"} · Sipariş {item.orderedQuantity} {item.unit} · Sevk {item.shippedQuantity} {item.unit} · Kalan {item.outstandingQuantity} {item.unit}
                  </p>
                  <p className="mt-1 text-xs text-[#65705f]">{backorderReasonLabel(item.reason)}{item.note ? ` · ${item.note}` : ""}</p>
                </div>
              ))}
              {!order.backorders.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[#65705f]">Bu siparişte eksik sevk kaydı yok.</p> : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Ürünler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between rounded-lg border p-3">
                  <div>
                    <b>{item.productName}</b>
                    <p className="text-xs text-[#65705f]">
                      {item.sku} · {item.quantity} {item.unit}
                    </p>
                  </div>
                  <span>{money(item.lineTotal, order.currency)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {order.status === "SUBMITTED" ? (
                <>
                  <form action={orderCommand.bind(null, id, "approve")}>
                    <Button>Onayla ve Rezerve Et</Button>
                  </form>
                  <form action={orderCommand.bind(null, id, "reject")}>
                    <Button variant="destructive">Reddet</Button>
                  </form>
                </>
              ) : null}
              {order.status === "APPROVED" ? (
                <>
                  <form action={orderCommand.bind(null, id, "invoice")}>
                    <Button>{order.parasutInvoiceId ? "Fatura Oluşturuldu" : "Mock Fatura Oluştur"}</Button>
                  </form>
                  {order.invoiceStatus === "CREATED" ? (
                    <form action={orderCommand.bind(null, id, "queue")}>
                      <Button>Depoya Aktar</Button>
                    </form>
                  ) : null}
                </>
              ) : null}
              {!["REJECTED", "CANCELLED", "SHIPPED", "DELIVERED"].includes(order.status) ? (
                <form action={orderCommand.bind(null, id, "cancel")}>
                  <Button variant="outline">İptal Et</Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit shadow-none">
          <CardHeader>
            <CardTitle>Zaman Çizelgesi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.activities.map((activity) => (
              <div key={activity.id} className="border-l-2 border-[#a8ff60] pl-3">
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="text-xs text-[#65705f]">{dateTime(activity.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
