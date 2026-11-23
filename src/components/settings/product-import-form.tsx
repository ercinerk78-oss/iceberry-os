"use client";

import { useRef, useState } from "react";
import { FileSearch, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { previewProductImport } from "@/lib/product-import-service";

type Preview = Awaited<ReturnType<typeof previewProductImport>>;
export function ProductImportForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  async function send(mode: "preview" | "apply") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("mode", mode);
      if (mode === "preview") {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error("Excel dosyasını seçin.");
        form.set("file", file); form.set("choices", JSON.stringify(choices));
        setPreview(null); setConfirmed(false); setReviewed(false);
      } else {
        if (!reviewed || !confirmed || !preview?.token) throw new Error("Önizlemeyi kontrol edip onaylayın.");
        form.set("token", preview.token); form.set("confirmed", "yes");
      }
      const response = await fetch("/settings/product-import/execute", { method: "POST", headers: { "x-iceberry-import": "1" }, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "İşlem tamamlanamadı.");
      if (mode === "preview") {
        setPreview(data); setReviewed(true);
        setChoices(Object.fromEntries((data as Preview).assignments.map(item => [item.name, item.selected])));
      } else {
        setResult(`${data.count} ürün ${data.alreadyApplied ? "daha önce güncellenmişti; ikinci kez uygulanmadı" : "güncellendi"}. Stok miktarları ve KDV oranları korundu. Yedek kayıt: ${data.auditId}`);
        setPreview(null); setReviewed(false);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  }
  function exportPreview() {
    if (!preview) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ rows: preview.rows, suppliers: preview.assignments }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "Iceberry-Urun-Aktarim-Onizleme.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end gap-3 border-b pb-4">
      <label className="grid min-w-0 gap-2 text-sm">Ürün Excel dosyası<input ref={fileRef} type="file" accept=".xlsx" disabled={busy} onChange={() => { setPreview(null); setChoices({}); setReviewed(false); setConfirmed(false); setResult(""); }} className="max-w-full rounded-lg border p-2" /></label>
      <Button type="button" disabled={busy} onClick={() => send("preview")}><FileSearch />{busy ? "İşleniyor..." : "Önizle ve Kontrol Et"}</Button>
    </div>
    <p className="text-sm text-muted-foreground">Stok miktarları, KDV oranları ve geçmiş işlemler korunur. Fiyatlar KDV hariçtir. Ticimax katsayıları kaydedilir; canlı sipariş entegrasyonu bu işlemle açılmaz.</p>
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {result ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{result}</p> : null}
    {preview ? <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tedarikçi Eşleştirmeleri</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{preview.assignments.map(assignment => <label key={assignment.name} className="grid min-w-0 gap-1 text-sm">{assignment.name}
          <select className="h-10 w-full min-w-0 rounded-lg border px-2" value={choices[assignment.name] ?? assignment.selected} disabled={busy} onChange={event => { setChoices(current => ({ ...current, [assignment.name]: event.target.value })); setReviewed(false); setConfirmed(false); }}>
            <option value="">Tedarikçi seçin</option>
            {preview.suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            <option value="__CREATE__">Yeni tedarikçi kartı oluştur: {assignment.name}</option>
          </select></label>)}</div>
        {preview.errors.length ? <ul className="space-y-1 text-sm text-red-700">{preview.errors.map(message => <li key={message}>{message}</li>)}</ul> : null}
        {!reviewed ? <p className="text-sm text-amber-800">Seçimler değişti. Önizlemeyi tekrar çalıştırın.</p> : null}
      </section>
      <section className="space-y-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{preview.rows.length} Ürün Güncellemesi</h2><Button type="button" variant="outline" onClick={exportPreview}><Download />Önizlemeyi İndir</Button></div>
        <p className="text-sm text-muted-foreground">Dosya dışında kalan {preview.untouchedCount} aktif ürün değiştirilmeyecek. Boş yeni ürün adı mevcut adı korur.</p>
        <div className="overflow-x-auto border"><table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-muted"><tr>{["Satır", "Ürün (Mevcut → Yeni)", "SKU (Mevcut → Yeni)", "Alış (Mevcut → Yeni)", "Satış (Mevcut → Yeni)", "Birim", "KDV", "Ticimax Karşılığı"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{preview.rows.map(row => <tr key={row.productId}>
            <td className="p-3">{row.row}</td><td className="max-w-64 p-3 break-words">{row.oldName}{row.oldName !== row.name ? <div className="font-semibold text-emerald-800">→ {row.name}</div> : null}</td>
            <td className="p-3"><span>{row.oldSku}</span><div className="font-semibold">→ {row.sku}</div></td>
            <td className="p-3 tabular-nums">{row.oldBuy}<div className="font-semibold">→ {row.purchasePrice}</div></td>
            <td className="p-3 tabular-nums">{row.oldSell}<div className="font-semibold">→ {row.salePrice}</div></td>
            <td className="p-3">{row.oldUnit === row.unit ? row.unit : `${row.oldUnit} → ${row.unit}`}</td><td className="p-3">%{row.vatRate}</td><td className="p-3">1 → {row.factor} {row.unit}</td>
          </tr>)}</tbody></table></div>
      </section>
      <div className="space-y-3 border-t pt-4">
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy || !reviewed || !!preview.errors.length} className="mt-1 size-4 shrink-0" />Ürünleri, tedarikçi seçimlerini ve KDV hariç fiyatları kontrol ettim. Yeni kart seçimlerini ve birim değişikliklerini onaylıyorum.</label>
        <Button type="button" disabled={busy || !confirmed || !reviewed || !preview.token || !!preview.errors.length} onClick={() => send("apply")}><Upload />Onayla ve Ürünleri Güncelle</Button>
      </div>
    </> : null}
  </div>;
}
