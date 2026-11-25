"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Minus, Trash2, FileDown, Save, Send } from "lucide-react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

import { useOrderDraft } from "@/components/orders/use-order-draft";
import { BranchSearchSelect } from "@/components/orders/branch-search-select";
import { mergeOrderBranches } from "@/lib/branch-search";
import { type DraftRecord, type DraftValues } from "@/lib/order-draft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/warehouse";
import { changeOrderQuantity, salesUnitFactor, toBaseQuantity } from "@/lib/order-quantity";
import { orderPdfDownloadFilename } from "@/lib/order-pdf-filename";

type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  salePrice: number;
  currency: string;
  vatRate: number;
  available: number;
  salesUnitFactor: number;
  unavailable?: boolean;
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
  draftId, userId, initialValues, initialRecord, canSubmit, canViewCenter,
}: {
  products: Product[];
  owners: Owner[];
  warehouseId: string;
  standaloneBranches: Owner["branches"];
  draftId: string; userId: string; initialValues: DraftValues; initialRecord: DraftRecord | null; canSubmit: boolean; canViewCenter: boolean;
}) {
  const draft = useOrderDraft({ id: draftId, userId, warehouseId, initialValues, initialRecord });
  const { values } = draft;
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<"recovery" | "cancel" | null>(null);
  const [query, setQuery] = useState("");
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const { shortages, cart, baseMode } = values;
  const edit = (update: (previous: DraftValues) => DraftValues) => { setNotice(""); draft.change(update); };
  const setShortages = (update: (previous: Record<string, boolean>) => Record<string, boolean>) => edit(previous => ({ ...previous, shortages: update(previous.shortages) }));
  const setBaseMode = (update: (previous: Record<string, boolean>) => Record<string, boolean>) => edit(previous => ({ ...previous, baseMode: update(previous.baseMode) }));
  const branches = useMemo(() => mergeOrderBranches(owners, standaloneBranches), [owners, standaloneBranches]);
  const hasBranch = branches.some(branch => branch.id === values.branchId);
  const items = useMemo(
    () => products.filter((product) => cart[product.id] > 0).map((product) => ({ ...product, quantity: cart[product.id] })),
    [cart, products],
  );
  const total = items.reduce((amount, item) => amount + item.salePrice * item.quantity * (1 + item.vatRate / 100), 0);
  const mixedCurrency = items.some((item) => item.currency !== items[0].currency);
  const missingProducts = Object.keys(cart).filter(id => cart[id] > 0 && !products.some(product => product.id === id));

  const setQuantity = (id: string, quantity: number) => {
    edit(previous => ({ ...previous, cart: { ...previous.cart, [id]: Math.max(0, Number.isFinite(quantity) ? quantity : 0) } }));
  };
  const found = query.trim() ? products.filter((product) => !product.unavailable &&
    (product.name + " " + product.sku).toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR")),
  ) : [];

  async function downloadPdf() {
    if(pdfPending)return;
    setPdfPending(true);setPdfError("");
    try {
      await draft.save();
      const response=await fetch("/orders/preview-pdf",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          warehouseId,franchiseeId:values.franchiseeId||undefined,branchId:values.branchId||undefined,
          requestedDeliveryDate:values.requestedDeliveryDate||undefined,notes:values.notes||undefined,
          items:items.map(item=>({productId:item.id,quantity:item.quantity,manualShortShipment:shortages[item.id]??false})),
        }),
      });
      if(!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
        const error=await response.json().catch(()=>null);
        throw new Error(error?.error||"PDF oluşturulamadı. Oturumunuzu ve sipariş bilgilerini kontrol edin.");
      }
      const url=URL.createObjectURL(await response.blob());
      const link=document.createElement("a");
      link.href=url;link.download=orderPdfDownloadFilename(response.headers);document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch(error) {setPdfError(error instanceof Error?error.message:"PDF indirilemedi.");}
    finally {setPdfPending(false);}
  }

  async function saveManually() {
    if (draft.reviewingRecovery) { setConfirmation("recovery"); return; }
    setPending(true);
    try { const saved = await (draft.reviewingRecovery ? draft.confirmRecovery() : draft.save()); setNotice(`${saved.orderNumber} taslağı kaydedildi.`); } catch { /* The draft hook displays persistence errors. */ }
    finally { setPending(false); }
  }
  async function confirmAction() {
    const command = confirmation;
    setConfirmation(null); setPending(true);
    try {
      const saved = command === "recovery" ? await draft.confirmRecovery() : await draft.save("cancel");
      setNotice(`${saved.orderNumber} taslağı güncellendi.`);
    } catch { /* The draft hook displays persistence errors. */ }
    finally { setPending(false); }
  }
  if (draft.closed) return <div className="space-y-4 rounded-lg border bg-white p-5">
    <p role="status" className="font-semibold text-emerald-700">{draft.record?.orderNumber}: {draft.record?.status === "SUBMITTED" ? "Depo onayı verildi. Sipariş merkez sipariş onayına gönderildi." : "Taslak iptal edildi."}</p>
    <div className="flex flex-wrap gap-2"><Button asChild><Link href="/orders?new=1">Yeni Taslak</Link></Button>{canViewCenter && draft.record?.status === "SUBMITTED" ? <Button variant="outline" asChild><Link href={`/orders/admin/${draft.record.id}`}>Merkez Sipariş Onayı</Link></Button> : null}</div>
  </div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><p role="status" className="text-sm text-muted-foreground">{draft.busy ? "Taslak kaydediliyor..." : draft.unsaved ? "Kaydedilmeyi bekleyen değişiklikler var" : draft.record ? `${draft.record.orderNumber} · Kaydedildi` : "Yeni taslak"}</p><Link href="/orders?new=1" className="text-sm font-medium underline">Yeni Taslak</Link></div>
      {draft.error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{draft.error}</p> : null}
      {!draft.localBackupAvailable ? <p role="alert" className="text-sm text-amber-800">Bu cihazda yerel yedek oluşturulamadı. Sunucu kaydı tamamlanmadan sayfayı kapatmayın.</p> : null}
      {draft.blocked ? <Button type="button" variant="outline" onClick={draft.reopen}>Güncel Taslağı Yeniden Aç</Button> : null}
      {draft.recovery ? <Button type="button" variant="outline" onClick={draft.restore}>Bu Cihazdaki Değişiklikleri Geri Yükle</Button> : null}
      {draft.reviewingRecovery ? <p role="status" className="text-sm text-amber-800">Yerel kopya incelemede; sunucuya kaydedilmedi.</p> : null}
    <form onSubmit={async event => {
      event.preventDefault();
      if (pending || pdfPending || !canSubmit) return;
      if (!hasBranch) { setPdfError("Sipariş için bir şube seçin."); return; }
      if (draft.reviewingRecovery) { setPdfError("Önce yerel kopyanın kaydını onaylayın."); return; }
      setPending(true); setPdfError("");
      try {
        await draft.save();
        await draft.save("submit");
      } catch { /* The draft hook displays persistence errors. */ }
      finally { setPending(false); }
    }} className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <fieldset disabled={!draft.ready || pending || pdfPending || draft.blocked} className="contents">
      <section className="min-w-0 space-y-4">
        <h2 className="text-lg font-bold text-gray-950">Ürün Seçimi</h2>
        <label className="block text-lg font-bold text-gray-950">Ürün adı veya SKU ile ara
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-gray-400 bg-white px-3 text-base font-semibold text-gray-950 placeholder:text-gray-600" placeholder="Ürün ara" />
        </label>
        <div className="divide-y rounded-lg border bg-white">
          {found.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0 text-sm"><b>{product.name}</b><p>{product.sku} · {product.available} {product.unit}</p></div>
            <label className="flex items-center gap-2 text-sm text-rose-700"><input type="checkbox" checked={shortages[product.id] ?? false} onChange={(event) => {
              setShortages((current) => ({ ...current, [product.id]: event.target.checked }));
              if (event.target.checked && !(cart[product.id] > 0)) setQuantity(product.id, salesUnitFactor(product.salesUnitFactor));
            }} />Eksik Sevk</label>
            <Button type="button" variant="outline" title={`${product.name}: ${salesUnitFactor(product.salesUnitFactor)} ${product.unit} ekle`} aria-label={`${product.name} ekle`} onClick={() => setQuantity(product.id, changeOrderQuantity(cart[product.id] ?? 0, salesUnitFactor(product.salesUnitFactor)))}><Plus className="size-4" /></Button>
          </div>)}
          {query.trim() && !found.length ? <p className="p-3 text-sm">Ürün bulunamadı.</p> : null}
        </div>
        <div className="space-y-3">
          {missingProducts.map(id => <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800"><span>Listede bulunamayan ürün · {cart[id]} birim</span><Button type="button" variant="outline" aria-label="Listede bulunamayan ürünü çıkar" title="Ürünü çıkar" onClick={() => setQuantity(id, 0)}><Trash2 className="size-4" /></Button></div>)}
          {items.map((product) => (
            <div key={product.id} className={`rounded-lg border p-4 ${shortages[product.id] ? "border-rose-500 bg-rose-50 text-rose-800" : "bg-white"}`}>
              <h3 className="font-bold">{product.name}</h3>
              {product.unavailable ? <p className="text-sm font-semibold text-rose-700">Ürün pasif; taslaktan çıkarılmalı.</p> : null}
              <p className="text-sm">{product.sku} · {money(product.salePrice, product.currency)} · Kullanılabilir: {product.available} {product.unit}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {salesUnitFactor(product.salesUnitFactor) !== 1 ? <select aria-label={`${product.name} miktar birimi`} value={baseMode[product.id] ? "base" : "sales"} onChange={(event) => setBaseMode((current) => ({ ...current, [product.id]: event.target.value === "base" }))} className="h-10 max-w-full rounded border bg-white px-2">
                  <option value="sales">Koli / paket ({product.salesUnitFactor} {product.unit})</option>
                  <option value="base">{product.unit}</option>
                </select> : null}
                <Button type="button" variant="outline" title="Miktarı azalt" aria-label={`${product.name} miktarını azalt`} onClick={() => setQuantity(product.id, changeOrderQuantity(product.quantity, -(baseMode[product.id] ? 1 : salesUnitFactor(product.salesUnitFactor))))}><Minus className="size-4" /></Button>
                <input aria-label={`${product.name} miktar`} type="number" inputMode="decimal" min="0" step="any" value={Number((product.quantity / (baseMode[product.id] ? 1 : salesUnitFactor(product.salesUnitFactor))).toFixed(9))} onChange={(event) => { if (event.target.value !== "") setQuantity(product.id, toBaseQuantity(event.target.valueAsNumber, baseMode[product.id] ? 1 : salesUnitFactor(product.salesUnitFactor))); }} className="h-10 w-28 rounded border bg-white px-2" />
                <span className="text-sm">{baseMode[product.id] || salesUnitFactor(product.salesUnitFactor) === 1 ? product.unit : "koli / paket"}</span>
                <Button type="button" variant="outline" title="Miktarı artır" aria-label={`${product.name} miktarını artır`} onClick={() => setQuantity(product.id, changeOrderQuantity(product.quantity, baseMode[product.id] ? 1 : salesUnitFactor(product.salesUnitFactor)))}><Plus className="size-4" /></Button>
                <Button type="button" variant="outline" title="Ürünü çıkar" aria-label={`${product.name} çıkar`} onClick={() => setQuantity(product.id, 0)}><Trash2 className="size-4" /></Button>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={shortages[product.id] ?? false} onChange={(event) => setShortages((current) => ({ ...current, [product.id]: event.target.checked }))} />Eksik Sevk</label>
              </div>
              <p className="mt-2 text-sm">Toplam: {product.quantity.toLocaleString("tr-TR", { maximumFractionDigits: 9 })} {product.unit} · {money(product.quantity * product.salePrice, product.currency)} (KDV hariç)</p>
              {shortages[product.id] ? <p className="mt-2 text-sm font-bold">Eksik sevk bildirimi — sevk ve fatura miktarı kontrol edilmeli</p> : null}
            </div>
          ))}
          {!items.length ? <p className="p-4 text-sm">Siparişte ürün yok.</p> : null}
        </div>
      </section>

      <Card className="h-fit overflow-visible shadow-none xl:sticky xl:top-28">
        <CardHeader>
          <CardTitle className="font-bold text-gray-950">Sipariş Özeti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <BranchSearchSelect branches={branches} value={values.branchId} onChange={id => edit(previous => ({ ...previous, branchId: id, franchiseeId: "" }))} required />
          <label className="block text-sm">
            <span className="text-base font-bold text-gray-950">Talep edilen teslim tarihi</span>
            <input type="date" name="requestedDeliveryDate" value={values.requestedDeliveryDate} onChange={event => edit(previous => ({ ...previous, requestedDeliveryDate: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border px-3" />
          </label>
          <label className="block text-sm">
            <span className="text-base font-bold text-gray-950">Fatura işlemi</span>
            <select name="invoicePreference" value={values.invoicePreference} onChange={event => edit(previous => ({ ...previous, invoicePreference: event.target.value as DraftValues["invoicePreference"] }))} className="mt-1 h-10 w-full rounded-lg border px-3">
              <option value="CREATE_PARASUT_INVOICE">Depo onayından sonra Paraşüt faturası oluştur</option>
              <option value="CREATE_LATER">Faturayı daha sonra oluştur</option>
              <option value="NOT_REQUIRED">Fatura gerekmiyor</option>
            </select>
          </label>
          <label className="block text-base font-bold text-gray-950">Sipariş notu
            <textarea name="notes" aria-label="Sipariş notu" placeholder="Sipariş notu" maxLength={1000} value={values.notes} onChange={event => edit(previous => ({ ...previous, notes: event.target.value }))} className="mt-1 min-h-20 w-full rounded-lg border p-3 text-sm font-normal" />
          </label>
          <div className="border-t pt-3">
            <div className="flex justify-between font-bold text-gray-950">
              <span>Genel toplam</span>
              <span>{mixedCurrency ? "Farklı para birimleri" : money(total, items[0]?.currency)}</span>
            </div>
            <p className="mt-1 text-xs text-[#65705f]">KDV dahildir · {items.length} kalem</p>
          </div>
          {pdfError ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{pdfError}</p> : null}
          {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
          <Button type="button" variant="outline" className="h-auto min-h-9 w-full whitespace-normal py-2" disabled={pending || pdfPending} onClick={() => void saveManually()}><Save className="size-4" />{draft.reviewingRecovery ? "Yerel Kopyayı Onayla ve Kaydet" : "Taslağı Kaydet"}</Button>
          <Button type="button" variant="outline" className="h-auto min-h-9 w-full whitespace-normal py-2" disabled={pdfPending || pending || draft.reviewingRecovery || !items.length || mixedCurrency || !hasBranch} onClick={() => void downloadPdf()}><FileDown className="size-4" />{pdfPending ? "PDF hazırlanıyor..." : "PDF İndir"}</Button>
          <Button className="h-auto min-h-9 w-full whitespace-normal py-2" disabled={pending || pdfPending || draft.reviewingRecovery || !canSubmit || !items.length || mixedCurrency || !hasBranch}>
            <Send className="size-4" />{pending ? "İşleniyor..." : "Onayla ve Merkeze Gönder"}
          </Button>
          {draft.record ? <Button type="button" variant="ghost" className="w-full text-rose-700" disabled={pending || pdfPending || draft.reviewingRecovery} onClick={() => setConfirmation("cancel")}><Trash2 className="size-4" />Taslağı İptal Et</Button> : null}
        </CardContent>
      </Card>
      </fieldset>
    </form>
    <AlertDialog.Root open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 110 }} />
        <AlertDialog.Popup className="space-y-4 rounded-lg border bg-white p-5 shadow-xl" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "calc(100% - 32px)", maxWidth: 480, zIndex: 120 }}>
          <AlertDialog.Title className="text-lg font-semibold">{confirmation === "recovery" ? "Yerel Kopyayı Kaydet" : "Taslağı İptal Et"}</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-muted-foreground">{confirmation === "recovery" ? "Yerel kopya, sunucudaki güncel taslağın yerine kaydedilecek. Değişiklikleri onaylıyor musunuz?" : "Bu sipariş taslağı iptal edilsin mi? Stok miktarları değişmeyecek."}</AlertDialog.Description>
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setConfirmation(null)}>Vazgeç</Button><Button type="button" variant={confirmation === "cancel" ? "destructive" : "default"} onClick={() => void confirmAction()}>Onayla</Button></div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
    </div>
  );
}
