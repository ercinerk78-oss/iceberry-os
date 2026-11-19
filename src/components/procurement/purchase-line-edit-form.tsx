"use client";

import { useActionState } from "react";
import { updatePurchaseOrderItemWithState } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";

export function PurchaseLineEditForm({ item }: { item: {
  id: string; quantity: number; unitPrice: string; vatRate: string; discountRate: string; notes: string; received: number;
} }) {
  const [state, action, pending] = useActionState(updatePurchaseOrderItemWithState.bind(null,item.id), { ok: false, message: "" });
  return <form action={action} className="mt-2 grid min-w-64 gap-2 rounded-lg border bg-white p-3">
    {([
      ["quantity", "Sipariş miktarı", String(item.quantity)],
      ["unitPrice", "Birim fiyat", item.unitPrice],
      ["vatRate", "KDV (%)", item.vatRate],
      ["discountRate", "İskonto (%)", item.discountRate],
    ] as const).map(([key,label,value]) => <label key={key} className="text-xs">{label}<input required name={key} readOnly={item.received > 0 && key !== "quantity"} type="text" inputMode="decimal" defaultValue={value.replace(".",",")} className="mt-1 h-9 w-full rounded border px-2 read-only:bg-gray-100" /></label>)}
    <label className="text-xs">Kalem notu<input name="itemNotes" maxLength={500} defaultValue={item.notes} className="mt-1 h-9 w-full rounded border px-2" /></label>
    {state.message ? <p role="status" className={state.ok ? "text-emerald-700" : "text-rose-700"}>{state.message}</p> : null}
    <Button disabled={pending} size="sm">{pending ? "Kaydediliyor..." : "Kaydet"}</Button>
  </form>;
}
