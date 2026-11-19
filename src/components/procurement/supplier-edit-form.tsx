"use client";

import { useActionState } from "react";
import { updateSupplierAction } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";

export function SupplierEditForm({ supplier }: { supplier: {
  id: string; name: string; code: string | null; phone: string | null;
  email: string | null; taxNumber: string | null; taxOffice: string | null;
  address: string | null; notes: string | null; status: string;
} }) {
  const [state, action, pending] = useActionState(updateSupplierAction.bind(null, supplier.id), { ok: false, message: "" });
  return <form action={action} className="grid min-w-64 gap-3 py-3 text-sm">
    {([
      ["name", "Tedarikçi adı"], ["code", "Tedarikçi kodu"], ["phone", "Telefon"],
      ["email", "E-posta"], ["taxNumber", "Vergi numarası"], ["taxOffice", "Vergi dairesi"],
    ] as const).map(([key,label]) => <label key={key}>{label}<input name={key} required={key === "name"} type={key === "email" ? "email" : "text"} maxLength={200} defaultValue={supplier[key] ?? ""} className="mt-1 h-9 w-full rounded border px-2" /></label>)}
    <label>Durum<select name="status" defaultValue={supplier.status} className="mt-1 h-9 w-full rounded border px-2"><option value="ACTIVE">Aktif</option><option value="PASSIVE">Pasif</option></select></label>
    <label>Adres<textarea name="address" maxLength={1000} defaultValue={supplier.address ?? ""} className="mt-1 w-full rounded border p-2" /></label>
    <label>Not<textarea name="notes" maxLength={1000} defaultValue={supplier.notes ?? ""} className="mt-1 w-full rounded border p-2" /></label>
    {state.message ? <p role="status" className={state.ok ? "text-emerald-700" : "text-rose-700"}>{state.message}</p> : null}
    <Button disabled={pending}>{pending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</Button>
  </form>;
}
