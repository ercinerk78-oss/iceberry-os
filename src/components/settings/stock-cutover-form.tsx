"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { previewStockCutover } from "@/lib/stock-cutover-service";

type Preview = Awaited<ReturnType<typeof previewStockCutover>>;
export function StockCutoverForm() {
  const file = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function send(apply: boolean) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("mode", apply ? "count-apply" : "count-preview");
      if (apply) {
        if (!confirmed || !preview) throw new Error("Sayım ve sevkiyat önizlemesini onaylayın.");
        form.set("token", preview.token); form.set("confirmed", "yes");
      } else {
        const selected = file.current?.files?.[0];
        if (!selected) throw new Error("Sayım dosyasını seçin.");
        form.set("file", selected); setPreview(null); setConfirmed(false);
      }
      const response = await fetch("/settings/product-import/execute", { method: "POST", headers: { "x-iceberry-import": "1" }, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sayım işlemi tamamlanamadı.");
      if (apply) { setMessage(`Sayım ve iki sevkiyat ${data.alreadyApplied ? "daha önce uygulanmış; tekrar işlenmedi" : "tamamlandı"}. Yedek: ${data.auditId}`); setPreview(null); }
      else setPreview(data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 border-t pt-6">
    <h2 className="text-lg font-semibold">20 Kasım Sayımı ve Teyitli Sevkiyatlar</h2>
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-0 gap-2 text-sm">20.11.2026 sayım dosyası<input ref={file} type="file" accept=".xlsx" disabled={busy} onChange={() => { setPreview(null); setConfirmed(false); setMessage(""); }} className="max-w-full rounded border p-2" /></label>
      <Button type="button" disabled={busy} onClick={() => send(false)}>{busy ? "İşleniyor..." : "Sayım ve Sevkiyatları Önizle"}</Button>
    </div>
    {message ? <p role="status" className="break-words border p-3 text-sm">{message}</p> : null}
    {preview ? <>
      <h3 className="font-semibold">{preview.warehouse.name}</h3>
      <div className="overflow-x-auto border"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr>{["SKU", "Ürün", "Mevcut Stok", "20 Kasım Sayım", "Fiilen Sevk", "Kalan Stok"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{preview.inventory.map(item => <tr key={item.productId} className="border-t"><td className="p-2">{item.sku}</td><td className="p-2">{item.name}</td><td className="p-2">{item.current}</td><td className="p-2">{item.counted}</td><td className="p-2">{item.shipped}</td><td className="p-2 font-semibold">{item.finalQuantity} {item.unit}</td></tr>)}</tbody></table></div>
      <div className="overflow-x-auto border"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr>{["Sipariş", "Ürün", "Eski Miktar", "Adet / kg", "Sevk", "Eksik", "KDV Hariç Tutar"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{preview.lines.map(line => <tr key={line.itemId} className={`border-t ${line.missing ? "bg-rose-50 text-rose-800" : ""}`}><td className="p-2">{line.orderNumber}</td><td className="p-2">{line.name}</td><td className="p-2">{line.oldQuantity}</td><td className="p-2">{line.ordered}</td><td className="p-2">{line.shipped}</td><td className="p-2">{line.missing}</td><td className="p-2">{line.subtotal.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</td></tr>)}</tbody></table></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Sayım sonrası yalnız bu iki sevkiyat var. Rubby Drop gönderilmedi; diğer kalemler gönderildi. Adetleri ve tutarları onaylıyorum.</label>
      <Button type="button" disabled={busy || !confirmed} onClick={() => send(true)}>Onayla ve Sayım ile Sevkiyatları İşle</Button>
    </> : null}
  </section>;
}
