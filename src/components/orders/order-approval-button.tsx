"use client";

import { useActionState } from "react";
import { approveOrderAction } from "@/app/orders/approval-actions";
import { Button } from "@/components/ui/button";

export function OrderApprovalButton({ orderId, detailed = false }: { orderId: string; detailed?: boolean }) {
  const [state, action, pending] = useActionState(approveOrderAction.bind(null, orderId), { ok: false, message: "" });
  return <form action={action} className="space-y-2">
    <Button size={detailed ? "default" : "sm"} disabled={pending || state.ok}>{pending ? "Onaylanıyor..." : detailed ? "Onayla ve Rezerve Et" : "Onayla"}</Button>
    {state.message ? <p role={state.ok ? "status" : "alert"} className={`max-w-sm text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p> : null}
  </form>;
}
