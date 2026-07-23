import { notFound } from "next/navigation";

import { orderCommand, savePreparation } from "@/app/orders/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      requestedDeliveryDate: true,
      franchisee: { select: { companyName: true } },
      branch: { select: { branchName: true } },
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unit: true,
          preparedQuantity: true,
          missingQuantity: true,
          product: {
            select: {
              stocks: { select: { warehouseId: true, quantity: true } },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  return (
    <AppShell activeHref="/warehouse/orders" eyebrow="Depo hazÄ±rlÄ±k" title={order.orderNumber}>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <form action={savePreparation.bind(null, id)}>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Toplama Listesi</CardTitle>
              <p className="text-sm text-[#65705f]">
                {order.franchisee.companyName} Â· {order.branch?.branchName ?? "Genel"} Â· Teslim{" "}
                {dateTime(order.requestedDeliveryDate)}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item) => {
                const stock = item.product.stocks.find((row) => row.warehouseId === order.warehouseId);

                return (
                  <div key={item.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_120px_120px]">
                    <input type="hidden" name="itemId" value={item.id} />
                    <div>
                      <b>{item.productName}</b>
                      <p className="text-xs text-[#65705f]">
                        Ä°stenen {item.quantity} {item.unit} Â· Fiziksel stok {stock?.quantity ?? 0}
                      </p>
                    </div>
                    <label className="text-xs">
                      HazÄ±rlanan
                      <input
                        name="preparedQuantity"
                        type="number"
                        min="0"
                        max={item.quantity}
                        step="0.01"
                        defaultValue={item.preparedQuantity}
                        className="mt-1 h-9 w-full rounded border px-2"
                      />
                    </label>
                    <label className="text-xs">
                      Eksik
                      <input
                        name="missingQuantity"
                        type="number"
                        min="0"
                        max={item.quantity}
                        step="0.01"
                        defaultValue={item.missingQuantity}
                        className="mt-1 h-9 w-full rounded border px-2"
                      />
                    </label>
                  </div>
                );
              })}
              <Button>HazÄ±rlÄ±ÄŸÄ± Kaydet</Button>
            </CardContent>
          </Card>
        </form>

        <Card className="h-fit shadow-none">
          <CardHeader>
            <CardTitle>Sevkiyat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.some((item) => item.missingQuantity > 0) ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Eksik ürün var. Sevkiyat kısmi yapılacak ve kalan ürünler borçlu ürün olarak takip edilecek.</p>
            ) : null}
            <form action={orderCommand.bind(null, id, "ready")}>
              <Button variant="outline" className="w-full">
                Sevkiyata HazÄ±r Ä°ÅŸaretle
              </Button>
            </form>
            <form action={orderCommand.bind(null, id, "ship")} className="space-y-2">
              <input name="carrierName" placeholder="TaÅŸÄ±yÄ±cÄ±" className="h-10 w-full rounded-lg border px-3" />
              <input name="trackingNumber" placeholder="Takip numarasÄ±" className="h-10 w-full rounded-lg border px-3" />
              {order.items.some((item) => item.missingQuantity > 0) ? (
                <>
                  <select name="backorderReason" defaultValue="STOCK_SHORTAGE" className="h-10 w-full rounded-lg border px-3">
                    {Object.entries(BACKORDER_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input name="expectedFulfillmentDate" type="date" aria-label="Beklenen tamamlama tarihi" className="h-10 w-full rounded-lg border px-3" />
                  <textarea name="backorderNote" placeholder="Eksik sevk notu" className="min-h-20 w-full rounded-lg border p-3 text-sm" />
                </>
              ) : null}
              <Button className="w-full">Sevk Et ve Stoktan Düş</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}