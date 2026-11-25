"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Plus, Save, Trash2, Check, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeBranchSearch } from "@/lib/branch-search";
import { stockCountProducts, type CountProduct, type CountedProduct } from "@/lib/stock-count";
import { countCommand } from "./actions";

type Count = { id: string; title: string; status: string; items: CountedProduct[] };
type CountRow = { id: string; title: string; status: string; warehouse: string; date: string; itemCount: number };

function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`h-10 min-w-0 max-w-full rounded-md border bg-background px-3 text-base ${className}`} />;
}

export function CountWorkspace({ rows, selected, warehouses, products }: { rows: CountRow[]; selected: Count | null; warehouses: { id: string; name: string }[]; products: CountProduct[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function execute(data: FormData) {
    if (pending) return false;
    setPending(true); setMessage("");
    try {
      const result = await countCommand(data);
      if (result.error || !result.id) { setMessage(result.error || "Sayım kaydedilemedi."); return false; }
      setMessage(data.get("command") === "approve" ? "Sayım onaylandı ve kilitlendi. Stok değişmedi." : "Kaydedildi. Stok değişmedi.");
      setCreating(false);
      if (selected?.id !== result.id) router.push(`/warehouse/counts?id=${encodeURIComponent(result.id)}`, { scroll: true });
      else router.refresh();
      return true;
    } catch { setMessage("İşlem tamamlanamadı. Girdiğiniz değerler ekranda korunuyor; tekrar deneyin."); return false; }
    finally { setPending(false); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><p className="text-sm text-muted-foreground">Sayım kayıtları stok miktarını değiştirmez.</p><Button type="button" disabled={pending || dirty} onClick={() => setCreating(!creating)}><Plus className="size-4" />Yeni Sayım</Button></div>
    {message && <p role="status" className="rounded border p-3 text-sm">{message}</p>}
    {creating && <form onSubmit={event => { event.preventDefault(); void execute(new FormData(event.currentTarget)); }} className="flex flex-wrap items-end gap-3 border-y py-4"><input type="hidden" name="command" value="create" /><label className="font-semibold">Sayım tarihi<Input required name="date" type="date" defaultValue={new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date())} /></label><label className="font-semibold">Depo<select name="warehouseId" required className="block h-10 max-w-full rounded border px-3">{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><Button disabled={pending || !warehouses.length} type="submit">Sayımı Başlat</Button></form>}
    {selected && <CountEditor key={selected.id} selected={selected} products={products} pending={pending} execute={execute} onDirtyChange={setDirty} />}
    <section><h2 className="mb-3 text-lg font-bold text-gray-950">Tüm Sayımlar</h2><div className="divide-y">{rows.map(row => <div key={row.id} className={`flex flex-wrap items-center justify-between gap-3 py-4 ${selected?.id === row.id ? "bg-muted/50" : ""}`}><div><p className="font-semibold">{row.title}</p><p className="text-sm text-muted-foreground">{row.warehouse} · {row.itemCount} kalem · {new Date(row.date).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })} · {row.status === "DRAFT" ? "Taslak" : "Salt okunur"}</p></div><Button asChild variant="outline"><Link href={`/warehouse/counts?id=${encodeURIComponent(row.id)}`} onClick={event => { if (pending || dirty) { event.preventDefault(); setMessage("Önce değiştirdiğiniz sayım kalemlerini kaydedin veya geri alın."); } }}>{row.status === "DRAFT" ? <Pencil className="size-4" /> : <Eye className="size-4" />}{row.status === "DRAFT" ? "Düzenle" : "İncele"}</Link></Button></div>)}{!rows.length && <p>Henüz sayım kaydı yok.</p>}</div></section>
  </div>;
}

function CountEditor({ selected, products, pending, execute, onDirtyChange }: { selected: Count; products: CountProduct[]; pending: boolean; execute: (data: FormData) => Promise<boolean>; onDirtyChange: (dirty: boolean) => void }) {
  const editor = useRef<HTMLElement>(null);
  useEffect(() => { editor.current?.scrollIntoView({ block: "start" }); editor.current?.focus({ preventScroll: true }); }, [selected.id]);
  const locked = selected.status !== "DRAFT";
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState<Record<string, number | null>>(() => Object.fromEntries(selected.items.map(item => [item.productId, item.quantity])));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(selected.items.map(item => [item.productId, item.quantity == null ? "" : String(item.quantity)])));
  const savedCount = Object.values(saved).filter(quantity => quantity !== null).length;
  const dirty = Object.entries(values).some(([id, value]) => value !== (saved[id] == null ? "" : String(saved[id])));
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty && !pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);
  const all = stockCountProducts(products, selected.items, locked);
  const filtered = all.filter(product => normalizeBranchSearch(`${product.name} ${product.sku}`).includes(normalizeBranchSearch(search)));

  function data(command: string, productId?: string) {
    const form = new FormData(); form.set("command", command); form.set("id", selected.id);
    if (productId) { form.set("productId", productId); form.set("quantity", values[productId] ?? ""); }
    return form;
  }

  return <section ref={editor} tabIndex={-1} className="scroll-mt-28 space-y-4 border-y py-5 outline-none" aria-label="Sayım düzenleme">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold text-gray-950">{selected.title}</h2><span>{locked ? "Onaylandı · Salt okunur" : "Taslak"} · Kaydedilen: {savedCount}</span></div>
    <label className="block text-base font-bold text-gray-950">Ürün adı veya SKU ile ara<Input aria-label="Sayıma ürün ara" placeholder="Ürün adı veya SKU ile ara" className="mt-2 w-full" value={search} onChange={event => setSearch(event.target.value)} /></label>
    {dirty && <p role="status" className="text-sm text-amber-800">Kaydedilmemiş miktarlar var. Her kalemin yanındaki Kaydet butonunu kullanın.</p>}
    <div className="divide-y border-y">{filtered.map(product => {
      const value = values[product.id] ?? "";
      const rowDirty = value !== (saved[product.id] == null ? "" : String(saved[product.id]));
      return <form key={product.id} onSubmit={async event => {
        event.preventDefault(); if (locked || pending) return;
        const quantity = Number(value);
        if (await execute(data("item", product.id))) { setSaved(previous => ({ ...previous, [product.id]: quantity })); setValues(previous => ({ ...previous, [product.id]: String(quantity) })); }
      }} className="flex flex-wrap items-center gap-3 py-3">
        <div className="w-full min-w-0 sm:w-auto sm:min-w-48 sm:flex-1"><p className="break-words font-semibold">{product.name}</p><p className="text-sm text-muted-foreground">SKU: {product.sku} · {product.unit}</p></div>
        {locked ? <span className="font-semibold">{saved[product.id] ?? "—"} {product.unit}</span> : <>
          <label className="text-sm font-semibold">Sayılan miktar<Input aria-label={`${product.name} sayılan miktar`} name="quantity" type="number" inputMode="decimal" min="0" max="1000000000" step="any" required value={value} disabled={pending} onChange={event => { setConfirming(false); setValues(previous => ({ ...previous, [product.id]: event.target.value })); }} className="mt-1 block w-32" /></label>
          <Button type="submit" disabled={pending || !value.trim()} className="self-end"><Save className="size-4" />Kaydet</Button>
          {rowDirty && <Button type="button" variant="ghost" disabled={pending} className="self-end" onClick={() => setValues(previous => ({ ...previous, [product.id]: saved[product.id] == null ? "" : String(saved[product.id]) }))}>Geri Al</Button>}
          {!rowDirty && saved[product.id] != null && <span className="self-end py-2 text-sm text-emerald-800">Kaydedildi</span>}
          {saved[product.id] !== undefined && <Button type="button" variant="outline" size="icon" className="self-end" title="Kalemi sayıma dahil etme" aria-label={`${product.name} sayım kaydını kaldır`} disabled={pending} onClick={async () => { if (await execute(data("remove", product.id))) { setSaved(previous => { const copy = { ...previous }; delete copy[product.id]; return copy; }); setValues(previous => ({ ...previous, [product.id]: "" })); } }}><Trash2 className="size-4" /></Button>}
        </>}
      </form>;
    })}{!filtered.length && <p className="py-6 text-sm text-muted-foreground">{locked ? "Kayıtlı sayım kalemi bulunamadı." : "Ürün bulunamadı."}</p>}</div>
    {!locked && (confirming ? <div role="alert" className="flex flex-wrap items-center gap-3 border p-4"><p>Kaydedilen {savedCount} kalem onaylanacak. Boş bırakılan ürünler sıfır sayılmaz, sayıma dahil edilmez. Onaydan sonra kayıt değiştirilemez.</p><Button type="button" disabled={pending || dirty} onClick={async () => { if (await execute(data("approve"))) setConfirming(false); }}>Onayla ve Kilitle</Button><Button type="button" variant="outline" onClick={() => setConfirming(false)}>Vazgeç</Button></div> : <Button type="button" disabled={pending || !savedCount || dirty} onClick={() => setConfirming(true)}><Check className="size-4" />Sayımı Tamamla</Button>)}
  </section>;
}
