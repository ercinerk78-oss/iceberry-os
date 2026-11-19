"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Minus, Trash2, FileDown } from "lucide-react";

import { submitOrder, type ActionResult } from "@/app/orders/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/warehouse";

type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  salePrice: number;
  currency: string;
  vatRate: number;
  available: number;
};

type Owner = {
  id: string;
  companyName: string;
  branches: { id: string; branchName: string }[];
};

export function OrderForm({
  products,
  owners,
  warehouseId,
  standaloneBranches,
}: {
  products: Product[];
  owners: Owner[];
  warehouseId: string;
  standaloneBranches: Owner["branches"];
}) {
  const [state, action, pending] = useActionState(submitOrder, {
    ok: false,
    message: "",
  } as ActionResult);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(false);
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [shortages, setShortages] = useState<Record<string, boolean>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState(standaloneBranches.length ? "" : owners[0]?.id ?? "");
  const branches = selected ? owners.find((owner) => owner.id === selected)?.branches ?? [] : standaloneBranches;
  const items = useMemo(
    () => products.filter((product) => cart[product.id] > 0).map((product) => ({ ...product, quantity: cart[product.id] })),
    [cart, products],
  );
  const total = items.reduce((amount, item) => amount + item.salePrice * item.quantity * (1 + item.vatRate / 100), 0);
  const mixedCurrency = items.some((item) => item.currency !== items[0].currency);

  const setQuantity = (id: string, quantity: number) => {
    setCart((current) => ({ ...current, [id]: Math.max(0, Number.isFinite(quantity) ? quantity : 0) }));
  };
  const found = query.trim() ? products.filter((product) =>
    (product.name + " " + product.sku).toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR")),
  ) : [];

  async function downloadPdf(form: HTMLFormElement) {
    if(pdfPending)return;
    setPdfPending(true);setPdfError("");
    const data=new FormData(form);
    try {
      const response=await fetch("/orders/preview-pdf",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          warehouseId,franchiseeId:data.get("franchiseeId")||undefined,branchId:data.get("branchId")||undefined,
          requestedDeliveryDate:data.get("requestedDeliveryDate")||undefined,notes:data.get("notes")||undefined,
          items:items.map(item=>({productId:item.id,quantity:item.quantity,manualShortShipment:shortages[item.id]??false})),
        }),
      });
      if(!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
        const error=await response.json().catch(()=>null);
        throw new Error(error?.error||"PDF oluşturulamadı. Oturumunuzu ve sipariş bilgilerini kontrol edin.");
      }
      const url=URL.createObjectURL(await response.blob());
      const link=document.createElement("a");
      link.href=url;link.download="Iceberry-Siparis-Onizleme.pdf";document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch(error) {setPdfError(error instanceof Error?error.message:"PDF indirilemedi.");}
    finally {setPdfPending(false);}
  }

  if (state.ok) return <div className="space-y-4 rounded-lg border bg-white p-5">
    <p role="status" className="font-semibold text-emerald-700">{state.message}</p>
    <Button asChild><a href="/orders">Yeni Sipariş</a></Button>
  </div>;

  return (
    <form action={action} onSubmit={(event) => {
      if (!preview) { event.preventDefault(); setPreview(true); void downloadPdf(event.currentTarget); }
    }} className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <input type="hidden" name="items" value={JSON.stringify(items.map((item) => ({ productId: item.id, quantity: item.quantity, manualShortShipment: shortages[item.id] ?? false })))} />

      <input type="hidden" name="previewConfirmed" value={preview ? "yes" : "no"} />
      <section className="min-w-0 space-y-4">
        <h2 className="text-lg font-semibold">{preview ? "Sipariş Önizlemesi" : "Ürün Seçimi"}</h2>
        <label className="block text-sm">Ürün adı veya SKU ile ara
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3" placeholder="Ürün ara" />
        </label>
        <div className="divide-y rounded-lg border bg-white">
          {found.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0 text-sm"><b>{product.name}</b><p>{product.sku} · {product.available} {product.unit}</p></div>
            <label className="flex items-center gap-2 text-sm text-rose-700"><input type="checkbox" checked={shortages[product.id] ?? false} onChange={(event) => {
              setShortages((current) => ({ ...current, [product.id]: event.target.checked }));
              if (event.target.checked && !(cart[product.id] > 0)) setQuantity(product.id, 1);
            }} />Eksik Sevk</label>
            <Button type="button" variant="outline" title={`${product.name} ekle`} aria-label={`${product.name} ekle`} onClick={() => setQuantity(product.id, (cart[product.id] ?? 0) + 1)}><Plus className="size-4" /></Button>
          </div>)}
          {query.trim() && !found.length ? <p className="p-3 text-sm">Ürün bulunamadı.</p> : null}
        </div>
        <div className="space-y-3">
          {items.map((product) => (
            <div key={product.id} className={`rounded-lg border p-4 ${shortages[product.id] ? "border-rose-500 bg-rose-50 text-rose-800" : "bg-white"}`}>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm">{product.sku} · {money(product.salePrice, product.currency)} · Kullanılabilir: {product.available} {product.unit}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" title="Miktarı azalt" aria-label={`${product.name} miktarını azalt`} onClick={() => setQuantity(product.id, product.quantity - 1)}><Minus className="size-4" /></Button>
                <input aria-label={`${product.name} adet`} type="number" inputMode="decimal" min="0" step="any" value={product.quantity} onChange={(event) => { if (event.target.value !== "") setQuantity(product.id, event.target.valueAsNumber); }} className="h-10 w-28 rounded border bg-white px-2" />
                <span className="text-sm">{product.unit}</span>
                <Button type="button" variant="outline" title="Miktarı artır" aria-label={`${product.name} miktarını artır`} onClick={() => setQuantity(product.id, product.quantity + 1)}><Plus className="size-4" /></Button>
                <Button type="button" variant="outline" title="Ürünü çıkar" aria-label={`${product.name} çıkar`} onClick={() => setQuantity(product.id, 0)}><Trash2 className="size-4" /></Button>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={shortages[product.id] ?? false} onChange={(event) => setShortages((current) => ({ ...current, [product.id]: event.target.checked }))} />Eksik Sevk</label>
              </div>
              {shortages[product.id] ? <p className="mt-2 text-sm font-bold">Eksik sevk bildirimi — sevk ve fatura miktarı kontrol edilmeli</p> : null}
            </div>
          ))}
          {!items.length ? <p className="p-4 text-sm">Siparişte ürün yok.</p> : null}
        </div>
      </section>

      <Card className="h-fit shadow-none xl:sticky xl:top-28">
        <CardHeader>
          <CardTitle>Sipariş Özeti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block text-sm">
            Şube grubu
            <select
              name="franchiseeId"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border px-3"
            >
              <option value="">Grupsuz şubeler</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.companyName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Şube
            <select key={selected} name="branchId" required={!selected} className="mt-1 h-10 w-full rounded-lg border px-3">
              <option value="">{selected ? "Genel merkez siparişi" : branches.length ? "Şube seçin" : "Grupsuz şube bulunamadı"}</option>
              {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branchName}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            Talep edilen teslim tarihi
            <input type="date" name="requestedDeliveryDate" className="mt-1 h-10 w-full rounded-lg border px-3" />
          </label>
          <label className="block text-sm">
            Fatura işlemi
            <select name="invoicePreference" defaultValue="CREATE_LATER" className="mt-1 h-10 w-full rounded-lg border px-3">
              <option value="CREATE_PARASUT_INVOICE">Depo onayından sonra Paraşüt faturası oluştur</option>
              <option value="CREATE_LATER">Faturayı daha sonra oluştur</option>
              <option value="NOT_REQUIRED">Fatura gerekmiyor</option>
            </select>
          </label>
          <textarea name="notes" placeholder="Sipariş notu" className="min-h-20 w-full rounded-lg border p-3" />
          <div className="border-t pt-3">
            <div className="flex justify-between font-semibold">
              <span>Genel toplam</span>
              <span>{mixedCurrency ? "Farklı para birimleri" : money(total, items[0]?.currency)}</span>
            </div>
            <p className="mt-1 text-xs text-[#65705f]">KDV dahildir · {items.length} kalem</p>
          </div>
          {preview ? <Button type="button" variant="outline" className="w-full" onClick={() => setPreview(false)}>Düzenlemeye Dön</Button> : null}
          {preview ? <Button type="button" variant="outline" className="w-full" disabled={pdfPending||pending} onClick={(event) => {
            const form=event.currentTarget.form;
            if(form?.reportValidity())void downloadPdf(form);
          }}><FileDown className="mr-2 size-4" />{pdfPending?"PDF hazırlanıyor...":"Güncel PDF’yi İndir"}</Button> : null}
          {pdfError ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{pdfError}</p> : null}
          {state.message ? (
            <p className={`rounded-lg p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {state.message}
            </p>
          ) : null}
          <Button className="w-full" disabled={pending || pdfPending || !items.length || mixedCurrency || (!selected && !branches.length)}>
            {pending ? "Gönderiliyor..." : preview ? "Onayla ve Siparişi Gönder" : "Önizleme"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
