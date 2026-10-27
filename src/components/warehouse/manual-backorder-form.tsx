"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { createManualBackorder, completeManualBackorder } from "@/app/warehouse/shipments/actions";
import { BACKORDER_REASONS } from "@/lib/backorders";
import { Button } from "@/components/ui/button";

const initial = { success: false, message: "" };
const input = "h-10 min-w-0 w-full rounded-lg border bg-white px-3 text-sm";

export function ManualBackorderForm({ branches, products }: { branches: { id: string; branchName: string }[]; products: { id: string; name: string; sku: string; unit: string }[] }) {
  const [state, action, pending] = useActionState(createManualBackorder, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) ref.current?.reset(); }, [state]);
  return <form ref={ref} action={action} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    <label className="grid gap-1 text-sm">Şube<select name="branchId" required className={input}><option value="">Şube seçin</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.branchName}</option>)}</select></label>
    <label className="grid gap-1 text-sm">Ürün<select name="productId" required className={input}><option value="">Ürün seçin</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku} · {item.unit}</option>)}</select></label>
    <label className="grid gap-1 text-sm">Eksik miktar<input name="quantity" type="number" step="any" min="0.000001" required className={input} /></label>
    <label className="grid gap-1 text-sm">Neden<select name="reason" className={input}>{Object.entries(BACKORDER_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="grid gap-1 text-sm">Planlanan sevk tarihi<input name="expectedFulfillmentDate" type="date" className={input} /></label>
    <label className="grid gap-1 text-sm">Not<input name="note" maxLength={2000} className={input} /></label>
    <Button type="submit" disabled={pending} className="justify-self-start"><Plus className="size-4" />{pending ? "Kaydediliyor..." : "Eksik Sevk Ekle"}</Button>
    {state.message ? <p role={state.success ? "status" : "alert"} className={`text-sm md:col-span-2 ${state.success ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
  </form>;
}

export function CompleteBackorderButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(completeManualBackorder.bind(null, id), initial);
  return <form action={action} className="mt-3 grid gap-2"><Button type="submit" variant="outline" disabled={pending || state.success}><CheckCircle2 className="size-4" />{pending ? "Kaydediliyor..." : "Tamamlandı"}</Button>{state.message ? <p role={state.success ? "status" : "alert"} className="text-sm">{state.message}</p> : null}</form>;
}
