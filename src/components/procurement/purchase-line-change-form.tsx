"use client";

import { useActionState } from "react";
import { changePurchaseOrderLineAction } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";

export function PurchaseLineChangeForm({ orderId, itemId, products = [] }: {
  orderId: string; itemId?: string; products?: { id: string; name: string; sku: string }[];
}) {
  const [state, action, pending] = useActionState(changePurchaseOrderLineAction.bind(null, orderId), { ok: false, message: "" });
  return <form action={action} className="space-y-3 text-sm">
    <input type="hidden" name="kind" value={itemId ? "REMOVE" : "ADD"} />
    {itemId ? <input type="hidden" name="itemId" value={itemId} /> : <>
      <label className="block">Ürün<select name="productId" required className="mt-1 h-10 w-full rounded border px-2"><option value="">Ürün seçin</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select></label>
      {([["quantity", "Miktar", "1"], ["unitPrice", "Birim alış fiyatı", "0"], ["vatRate", "KDV (%)", "20"], ["discountRate", "İskonto (%)", "0"]] as const).map(([key,label,value]) => <label key={key} className="block">{label}<input required name={key} type="number" inputMode="decimal" min={key === "quantity" ? "0.000001" : "0"} max={key === "vatRate" || key === "discountRate" ? "100" : undefined} step="any" defaultValue={value} className="mt-1 h-9 w-full rounded border px-2" /></label>)}
      <label className="block">Kalem notu<input name="notes" maxLength={500} className="mt-1 h-9 w-full rounded border px-2" /></label>
    </>}
    {state.message ? <p role="status" className={state.ok ? "text-emerald-700" : "text-rose-700"}>{state.message}</p> : null}
    <Button disabled={pending} variant={itemId ? "destructive" : "default"}>{pending ? "Kaydediliyor..." : itemId ? "Ürünü Siparişten Çıkar" : "Ürünü Siparişe Ekle"}</Button>
  </form>;
}
