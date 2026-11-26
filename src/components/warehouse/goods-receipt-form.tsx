"use client";

import { useActionState, useMemo, useState } from "react";

import { createGoodsReceiptAction, type GoodsReceiptActionState } from "@/app/warehouse/goods-receipts/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OrderOption = {
  id: string;
  orderNumber: string;
  supplierName: string;
  warehouseName: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    unit: string;
    remainingQuantity: number;
  }[];
};

const initialState: GoodsReceiptActionState = { ok: false, message: "" };

export function GoodsReceiptForm({ orders }: { orders: OrderOption[] }) {
  const [state, action, pending] = useActionState(createGoodsReceiptAction, initialState);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId), [orders, selectedOrderId]);

  if (!orders.length) {
    return (
      <Card className="shadow-none">
        <CardContent className="p-6 text-sm text-[#65705f]">Mal kabul yapılacak açık satın alma siparişi yok.</CardContent>
      </Card>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Card className="shadow-none">
        <CardHeader><CardTitle>Gelen Ürünü Say ve Kabul Et</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <label className="text-sm md:col-span-2">
            Satın Alma Siparişi
            <select name="purchaseOrderId" value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} required className="mt-1 h-10 w-full rounded-lg border px-3">
              {orders.map((order) => (
                <option key={order.id} value={order.id}>{order.orderNumber} - {order.supplierName} - {order.warehouseName}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Teslim Tarihi
            <input name="deliveryDate" type="date" className="mt-1 h-10 w-full rounded-lg border px-3" />
          </label>
          <label className="text-sm">
            Fatura / İrsaliye No
            <input name="invoiceNumber" className="mt-1 h-10 w-full rounded-lg border px-3" />
          </label>
          <label className="text-sm md:col-span-2">
            Mal Kabul Notu
            <input name="notes" placeholder="Genel kabul notu" className="mt-1 h-10 w-full rounded-lg border px-3" />
          </label>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle>Sayım Kalemleri</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {selectedOrder?.items.map((item) => (
            <div key={`${selectedOrder.id}-${item.productId}-${item.remainingQuantity}`} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.4fr_2fr]">
              <input type="hidden" name="productId" value={item.productId} />
              <input type="hidden" name="expectedQuantity" value={item.remainingQuantity} />
              <div>
                <p className="text-sm font-semibold">{item.productName}</p>
                <p className="text-xs text-[#65705f]">{item.sku} · {item.unit}</p>
              </div>
              <ReceiptQuantities remaining={item.remainingQuantity} />
              <details className="lg:col-span-2">
                <summary className="cursor-pointer text-sm">Hasar, Lot, SKT ve Not</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs">
                Hasarlı
                <input name="damagedQuantity" type="number" min="0" step="0.01" defaultValue="0" className="mt-1 h-10 w-full rounded-lg border px-2" />
              </label>
              <label className="text-xs">
                Birim
                <input disabled value={item.unit} className="mt-1 h-10 w-full rounded-lg border bg-[#f8faf6] px-2" />
              </label>
              <label className="text-xs">
                Lot
                <input name="lotNumber" className="mt-1 h-10 w-full rounded-lg border px-2" />
              </label>
              <label className="text-xs">
                SKT
                <input name="expirationDate" type="date" className="mt-1 h-10 w-full rounded-lg border px-2" />
              </label>
              <label className="text-xs">
                Not
                <input name="itemNotes" className="mt-1 h-10 w-full rounded-lg border px-2" />
              </label>
                </div>
              </details>
            </div>
          ))}
          {state.message ? (
            <p className={`rounded-lg p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {state.message}
            </p>
          ) : null}
          <fieldset key={selectedOrderId} disabled={pending} className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">Teslimat Sonrası Sipariş</legend>
            <label className="flex items-start gap-2 text-sm"><input type="radio" name="closeRemaining" value="wait" defaultChecked className="mt-0.5 size-4 shrink-0" />Kalan ürünleri bekle; sipariş açık kalsın</label>
            <label className="flex items-start gap-2 text-sm"><input type="radio" name="closeRemaining" value="on" className="mt-0.5 size-4 shrink-0" />Bu teslimatla siparişi tamamla; başka ürün beklenmiyor</label>
          </fieldset>
          <Button disabled={pending}>{pending ? "Stoğa işleniyor..." : "Mal Kabulü Kaydet ve Stoğa İşle"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}

function ReceiptQuantities({ remaining }: { remaining: number }) {
  const [received, setReceived] = useState(String(remaining));
  const [accepted, setAccepted] = useState(String(remaining));
  const difference = Number(received) - remaining;
  return <div className="grid grid-cols-3 gap-3">
    <label className="text-xs">Kalan Sipariş<input readOnly value={remaining} className="mt-1 h-10 w-full rounded-lg border bg-muted px-2" /></label>
    <label className="text-xs">Gelen<input name="receivedQuantity" required type="number" min="0" step="0.01" value={received} onChange={(event) => { setReceived(event.target.value); if (accepted === received) setAccepted(event.target.value); }} className="mt-1 h-10 w-full rounded-lg border px-2" /></label>
    <label className="text-xs">Kabul Edilen<input name="acceptedQuantity" required type="number" min="0" max={received || 0} step="0.01" value={accepted} onChange={(event) => setAccepted(event.target.value)} className="mt-1 h-10 w-full rounded-lg border px-2" /></label>
    {received !== "" && difference !== 0 ? <p className="col-span-3 text-xs text-amber-700" role="status">{Math.abs(difference).toLocaleString("tr-TR")} adet {difference > 0 ? "fazla" : "eksik"} teslimat</p> : null}
  </div>;
}
