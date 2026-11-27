"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { cancelPurchaseRequestAction } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";

export function PurchaseRequestCancelForm({ requestId, requestNumber }: { requestId: string; requestNumber: string }) {
  const [state, action, pending] = useActionState(cancelPurchaseRequestAction.bind(null, requestId), { ok: false, message: "" });
  return <form action={action} className="space-y-2" onSubmit={event => {
    if (!window.confirm(`${requestNumber} numaralı talep kaldırılsın mı? Talep iptal edilmiş olarak geçmişte saklanacak. Stok ve sipariş kayıtları değişmeyecek.`)) event.preventDefault();
  }}>
    <Button type="submit" variant="outline" size="sm" disabled={pending || state.ok} className="text-red-700"><Trash2 className="size-4" />{pending ? "Kaldırılıyor..." : "Talebi Kaldır"}</Button>
    {state.message ? <p role="status" className={`max-w-sm text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p> : null}
  </form>;
}
