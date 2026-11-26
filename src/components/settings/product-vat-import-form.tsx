"use client";
import { useActionState } from "react";
import { previewVatImport, applyVatImport, type VatImportState } from "@/app/settings/product-vat-import/actions";
import { Button } from "@/components/ui/button";
const initial: VatImportState = { ok: false, message: "" };
export function ProductVatImportForm() {
  const [preview, previewAction, previewPending] = useActionState(previewVatImport, initial);
  const [result, applyAction, applying] = useActionState(applyVatImport, initial);
  return <div className="space-y-5">
    <form action={previewAction} className="flex flex-wrap items-end gap-3"><label className="text-sm">KDV Excel Dosyası<input className="mt-1 block max-w-full rounded border p-2" type="file" name="file" accept=".xlsx" required /></label><Button disabled={previewPending || applying}>{previewPending ? "Kontrol ediliyor..." : "Önizle"}</Button></form>
    {preview.message && <p role="status" className={preview.ok ? "text-emerald-800" : "text-rose-700"}>{preview.message}</p>}
    {preview.token && !result.ok && <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Ürün", "SKU", "Mevcut KDV", "Yeni KDV"].map(h => <th key={h} className="border-b p-2">{h}</th>)}</tr></thead><tbody>{preview.items?.map(i => <tr key={i.id}><td className="border-b p-2">{i.name}</td><td className="border-b p-2">{i.sku}</td><td className="border-b p-2">%{i.oldVatRate}</td><td className="border-b p-2">%{i.vatRate}</td></tr>)}</tbody></table></div><form action={applyAction}><input type="hidden" name="token" value={preview.token} /><Button disabled={applying || previewPending}>{applying ? "Uygulanıyor..." : "Onayla ve KDV Oranlarını Güncelle"}</Button></form></>}
    {result.message && <p role="status" className={result.ok ? "text-emerald-800" : "text-rose-700"}>{result.message}</p>}
  </div>;
}
