"use client";

import { useActionState } from "react";
import { reopenPurchaseRequestAction } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";

export function PurchaseRequestReopenForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(reopenPurchaseRequestAction.bind(null, requestId), { ok: false, message: "" });
  return <form action={action} className="space-y-3 rounded-lg border p-4">
    <p className="text-sm">Bu talep onay bekliyor. Düzenlemek için onaydan geri çekip taslağa alabilirsiniz.</p>
    <Button disabled={pending}>{pending ? "Taslağa alınıyor..." : "Düzenlemek İçin Taslağa Al"}</Button>
    {state.message ? <p role="status" className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
  </form>;
}
