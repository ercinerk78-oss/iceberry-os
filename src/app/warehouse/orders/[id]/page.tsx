import { notFound } from "next/navigation";

import { orderCommand } from "@/app/orders/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WarehousePickingPanel } from "@/components/warehouse/warehouse-picking-panel";
import { BACKORDER_REASONS } from "@/lib/backorders";
import { prisma } from "@/lib/prisma";
import { dateTime } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function PreparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.franchiseOrder.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      warehouseId: true,
      status: true,
      invoiceStatus: true,
      readyToShipAt: true,
      requestedDeliveryDate: true,
      franchisee: { select: { companyName: true } },
      branch: { select: { branchName: true } },
      items: {
        select: {
          id: true,
          productName: true,
          sku: true,
          quantity: true,
          unit: true,
          reservedQuantity: true,
          pickedQuantity: true,
          packedQuantity: true,
          shippedQuantity: true,
          missingQuantity: true,
          product: {
            select: {
              barcode: true,
              unit: true,
              barcodes: {
                where: { isActive: true },
                select: { barcode: true, unitName: true, conversionFactor: true },
              },
              stocks: { select: { warehouseId: true, quantity: true } },
            },
          },
          pickingScans: {
            select: { id: true, quantity: true, scanType: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      pickingScans: {
        select: {
          id: true,
          barcode: true,
          quantity: true,
          scanType: true,
          note: true,
          scannedAt: true,
          orderItem: { select: { productName: true } },
        },
        orderBy: { scannedAt: "desc" },
        take: 12,
      },
    },
  });

  if (!order) notFound();

  const canShip = Boolean(order.readyToShipAt);
  const hasMissingItems = order.items.some((item) => Math.max(0, item.quantity - item.pickedQuantity) > 0);
  const items = order.items.map((item) => ({
    id: item.id,
    productName: item.productName,
    sku: item.sku,
    barcode: item.product.barcode,
    barcodeSummary: [
      item.product.barcode ? `Ana: ${item.product.barcode}` : null,
      ...item.product.barcodes.map((barcode) => `${barcode.unitName}: ${barcode.barcode} (${barcode.conversionFactor} ${item.unit})`),
    ].filter(Boolean).join(" · "),
    quantity: item.quantity,
    reservedQuantity: item.reservedQuantity,
    pickedQuantity: item.pickedQuantity,
    packedQuantity: item.packedQuantity,
    shippedQuantity: item.shippedQuantity,
    missingQuantity: item.missingQuantity,
    stockQuantity: item.product.stocks.find((row) => row.warehouseId === order.warehouseId)?.quantity ?? 0,
    scanCount: item.pickingScans.filter((scan) => scan.scanType === "BARCODE_SCAN").reduce((sum, scan) => sum + scan.quantity, 0),
    manualOverrideCount: item.pickingScans.filter((scan) => scan.scanType === "MANUAL_OVERRIDE").length,
  }));

  return (
    <AppShell activeHref="/warehouse/orders" eyebrow="Depo hazırlık" title={order.orderNumber}>
      <div className="space-y-5">
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{order.franchisee.companyName} / {order.branch?.branchName ?? "Genel"}</CardTitle>
                <p className="mt-1 text-sm text-[#65705f]">
                  Teslim {dateTime(order.requestedDeliveryDate)} · Fatura: {order.invoiceStatus}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{order.status}</Badge>
                {canShip ? <Badge variant="secondary">Depo kontrolü onaylandı</Badge> : <Badge variant="outline">Depo kontrolü bekliyor</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WarehousePickingPanel
              orderId={order.id}
              items={items}
              scans={order.pickingScans.map((scan) => ({
                id: scan.id,
                productName: scan.orderItem.productName,
                barcode: scan.barcode,
                quantity: scan.quantity,
                scanType: scan.scanType,
                note: scan.note,
                scannedAt: dateTime(scan.scannedAt),
              }))}
              canShip={canShip}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Sevkiyat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[1fr_360px]">
            <div className="space-y-2 text-sm text-[#65705f]">
              {hasMissingItems ? (
                <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
                  Eksik ürün var. Sevkiyat kısmi yapılır ve kalan ürünler mevcut borçlu ürün takibine bağlanır.
                </p>
              ) : (
                <p className="rounded-lg bg-emerald-50 p-3 text-emerald-700">Tüm ürünler sevkiyata hazır görünüyor.</p>
              )}
              {!canShip ? <p>Sevkiyat ve fatura için önce depo kontrolünü onaylayın.</p> : null}
            </div>
            <form action={orderCommand.bind(null, id, "ship")} className="space-y-2">
              <input name="carrierName" placeholder="Taşıyıcı" className="h-10 w-full rounded-lg border px-3" />
              <input name="trackingNumber" placeholder="Takip numarası" className="h-10 w-full rounded-lg border px-3" />
              {hasMissingItems ? (
                <>
                  <select name="backorderReason" defaultValue="STOCK_SHORTAGE" className="h-10 w-full rounded-lg border px-3">
                    {Object.entries(BACKORDER_REASONS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    name="expectedFulfillmentDate"
                    type="date"
                    aria-label="Beklenen tamamlama tarihi"
                    className="h-10 w-full rounded-lg border px-3"
                  />
                  <textarea name="backorderNote" placeholder="Eksik sevk notu" className="min-h-20 w-full rounded-lg border p-3 text-sm" />
                </>
              ) : null}
              <Button className="w-full" disabled={!canShip}>
                Sevk Et ve Stoktan Düş
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
