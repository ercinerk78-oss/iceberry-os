import Link from "next/link";
import type React from "react";
import { PackageOpen, Truck } from "lucide-react";

import { cancelBackorder, updateBackorderPlan } from "@/app/warehouse/shipments/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BACKORDER_REASONS, backorderReasonLabel, backorderStatusLabel } from "@/lib/backorders";
import { prisma } from "@/lib/prisma";
import { containsInsensitive } from "@/lib/search";
import { dateTime } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

type Params = { view?: string; q?: string };

export default async function Shipments({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const view = params.view || "all";
  const q = params.q?.trim();
  const now = new Date().getTime();
  const shipmentWhere = {
    ...(q
      ? {
          OR: [
            { shipmentNumber: containsInsensitive(q) },
            { order: { orderNumber: containsInsensitive(q) } },
            { order: { franchisee: { companyName: containsInsensitive(q) } } },
            { order: { branch: { branchName: containsInsensitive(q) } } },
          ],
        }
      : {}),
    ...(view === "partial" ? { order: { status: "BACKORDER_PENDING" } } : {}),
  };
  const backorderWhere = {
    ...(view === "fulfilled" ? { status: "FULFILLED" } : { status: { in: ["OPEN", "PARTIALLY_FULFILLED"] } }),
    ...(q
      ? {
          OR: [
            { order: { orderNumber: containsInsensitive(q) } },
            { order: { franchisee: { companyName: containsInsensitive(q) } } },
            { branch: { branchName: containsInsensitive(q) } },
            { product: { name: containsInsensitive(q) } },
            { product: { sku: containsInsensitive(q) } },
          ],
        }
      : {}),
  };

  const [rows, backorders] = await Promise.all([
    prisma.shipment.findMany({
      where: shipmentWhere,
      select: {
        id: true,
        shipmentNumber: true,
        status: true,
        carrierName: true,
        trackingNumber: true,
        shippedAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            franchisee: { select: { companyName: true } },
            branch: { select: { branchName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.shipmentBackorder.findMany({
      where: backorderWhere,
      include: {
        order: { select: { id: true, orderNumber: true, franchisee: { select: { companyName: true } } } },
        branch: { select: { id: true, branchName: true } },
        shipment: { select: { shipmentNumber: true } },
        product: { select: { name: true, sku: true } },
      },
      orderBy: [{ status: "asc" }, { expectedFulfillmentDate: "asc" }, { createdAt: "asc" }],
      take: 150,
    }),
  ]);

  const openCount = backorders.filter((item) => ["OPEN", "PARTIALLY_FULFILLED"].includes(item.status)).length;
  const outstandingTotal = backorders.filter((item) => item.status !== "CANCELLED").reduce((sum, item) => sum + item.outstandingQuantity, 0);

  return (
    <AppShell activeHref="/warehouse/shipments" eyebrow="Merkez depo" title="Sevkiyatlar">
      <div className="space-y-5">
        <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_auto]">
          <input name="q" defaultValue={q} placeholder="Sevkiyat, sipariş, bayi, şube veya ürün ara" className="h-10 rounded-lg border px-3" />
          <div className="flex flex-wrap gap-2">
            <Button>Filtrele</Button>
            <Button asChild type="button" variant="outline"><Link href="/warehouse/shipments">Temizle</Link></Button>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <FilterLink href="/warehouse/shipments" active={view === "all"}>Tüm Sevkiyatlar</FilterLink>
            <FilterLink href="/warehouse/shipments?view=partial" active={view === "partial"}>Kısmi Sevkiyatlar</FilterLink>
            <FilterLink href="/warehouse/shipments?view=open" active={view === "open"}>Eksik Ürün Bekleyenler</FilterLink>
            <FilterLink href="/warehouse/shipments?view=fulfilled" active={view === "fulfilled"}>Tamamlanan Borçlu Ürünler</FilterLink>
          </div>
        </form>

        <section className="grid gap-3 md:grid-cols-3">
          <Kpi title="Açık Eksik Sevk" value={openCount} />
          <Kpi title="Toplam Borçlu Ürün" value={outstandingTotal} />
          <Kpi title="Listelenen Sevkiyat" value={rows.length} />
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold"><Truck className="size-4" />Tüm Sevkiyatlar</h2>
          {rows.map((shipment) => (
            <div key={shipment.id} className="rounded-xl border bg-white p-4">
              <b>{shipment.shipmentNumber}</b> · <Badge variant="outline">{shipment.order.status}</Badge>
              <p className="mt-1 text-sm text-[#65705f]">
                {shipment.order.franchisee.companyName} / {shipment.order.branch?.branchName ?? "Genel"} · {shipment.carrierName ?? "Taşıyıcı yok"} · {shipment.trackingNumber ?? "Takip no yok"} · {dateTime(shipment.shippedAt)}
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3"><Link href={`/orders/admin/${shipment.order.id}`}>Sipariş Detayı</Link></Button>
            </div>
          ))}
          {!rows.length ? <p className="rounded-xl border border-dashed p-10 text-center">Henüz sevkiyat yok.</p> : null}
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold"><PackageOpen className="size-4" />Eksik Ürün Takibi</h2>
          <div className="grid gap-3">
            {backorders.map((item) => {
              const daysOpen = Math.max(0, Math.floor((now - item.createdAt.getTime()) / 86400000));
              return (
                <article key={item.id} className="rounded-xl border bg-white p-4">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{backorderStatusLabel(item.status)}</Badge>
                        <Badge variant="secondary">{backorderReasonLabel(item.reason)}</Badge>
                      </div>
                      <h3 className="mt-3 font-semibold">{item.product.name}</h3>
                      <p className="text-sm text-[#65705f]">
                        {item.order.franchisee.companyName} / {item.branch?.branchName ?? "Genel"} · Sipariş {item.order.orderNumber} · Sevkiyat {item.shipment?.shipmentNumber ?? "-"}
                      </p>
                      <p className="mt-2 text-sm">
                        Sipariş: <b>{item.orderedQuantity} {item.unit}</b> · Sevk: <b>{item.shippedQuantity} {item.unit}</b> · Kalan: <b>{item.outstandingQuantity} {item.unit}</b> · Açık gün: <b>{daysOpen}</b>
                      </p>
                      {item.note ? <p className="mt-2 text-sm text-[#65705f]">{item.note}</p> : null}
                    </div>
                    <form action={updateBackorderPlan.bind(null, item.id)} className="grid min-w-72 gap-2">
                      <select name="reason" defaultValue={item.reason} className="h-9 rounded-lg border px-2 text-sm">
                        {Object.entries(BACKORDER_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input name="expectedFulfillmentDate" type="date" defaultValue={item.expectedFulfillmentDate?.toISOString().slice(0, 10) ?? ""} className="h-9 rounded-lg border px-2 text-sm" />
                      <input name="note" defaultValue={item.note ?? ""} placeholder="Not" className="h-9 rounded-lg border px-2 text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Güncelle</Button>
                        {item.status !== "CANCELLED" && item.status !== "FULFILLED" ? (
                          <Button formAction={cancelBackorder.bind(null, item.id)} size="sm" variant="outline">İptal</Button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                </article>
              );
            })}
            {!backorders.length ? <p className="rounded-xl border border-dashed p-10 text-center text-[#65705f]">Filtreye uygun eksik sevk kaydı yok.</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`rounded-lg border px-3 py-2 text-sm ${active ? "bg-[#17201b] text-white" : "bg-white"}`}>{children}</Link>;
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-[#65705f]">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}
