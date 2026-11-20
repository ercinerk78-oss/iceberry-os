"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updatePurchaseRequestSupplierAction } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";

export function PurchaseRequestSupplierForm({ requestId, supplierId, suppliers }: {
  requestId: string;
  supplierId: string | null;
  suppliers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updatePurchaseRequestSupplierAction.bind(null, requestId), { ok: false, message: "" });
  return <form action={action} className="min-w-48 space-y-2">
    <div className="flex gap-2">
      <select name="supplierId" aria-label="Talebin önerilen tedarikçisi" defaultValue={supplierId ?? ""} className="h-10 min-w-0 flex-1 rounded-lg border px-2" disabled={pending}>
        <option value="">DİĞER / BELİRSİZ</option>
        {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
      </select>
      <Button type="submit" variant="outline" size="icon" disabled={pending} title="Tedarikçiyi kaydet" aria-label="Tedarikçiyi kaydet"><Save className="size-4" /></Button>
    </div>
    {state.message ? <p role="status" className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
  </form>;
}
