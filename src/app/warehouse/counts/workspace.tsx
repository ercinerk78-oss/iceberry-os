"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";
import { countCommand } from "./actions";

type Product = { id: string; name: string; sku: string; unit: string };
function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`h-10 min-w-0 max-w-full rounded-md border bg-background px-3 text-sm ${className}`} />;
}
type Count = { id: string; title: string; status: string; items: { productId: string; name: string; sku: string; unit: string; quantity: number | null; expected: number }[] };
export function CountWorkspace({ rows, selected, warehouses, products }: { rows: { id: string; title: string; status: string; warehouse: string; date: string; itemCount: number }[]; selected: Count | null; warehouses: { id: string; name: string }[]; products: Product[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const locked = selected?.status !== "DRAFT";
  function execute(data: FormData) {
    start(async () => {
      const result = await countCommand(data);
      if (result.error) { setMessage(result.error); return; }
      setMessage("Kaydedildi."); setCreating(false); setConfirming(false);
      router.push(`/warehouse/counts?id=${result.id}`); router.refresh();
    });
  }
  function command(name: string, productId?: string) {
    const data = new FormData(); data.set("command", name); data.set("id", selected!.id);
    if (productId) data.set("productId", productId);
    execute(data);
  }
  const normalize = (value: string) => value.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
  const matches = search.trim() ? products.filter(p => normalize(`${p.name} ${p.sku}`).includes(normalize(search))) : [];
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><p className="text-sm text-muted-foreground">Sayım kayıtları stok miktarını değiştirmez.</p><Button onClick={() => setCreating(!creating)}><Plus className="size-4" />Yeni Sayım</Button></div>
    {message && <p role="status" className="rounded border p-3 text-sm">{message}</p>}
    {creating && <form action={execute} className="flex flex-wrap items-end gap-3 border-y py-4"><input type="hidden" name="command" value="create" /><label>Sayım tarihi<Input required name="date" type="date" defaultValue={new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date())} /></label><label>Depo<select name="warehouseId" required className="block h-10 max-w-full rounded border px-3">{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><Button disabled={pending || !warehouses.length} type="submit">Sayımı Başlat</Button></form>}
    {selected && <section className="space-y-4 border-y py-5">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-semibold">{selected.title}</h2><span>{locked ? "Onaylandı · Salt okunur" : "Taslak"}</span></div>
      {!locked && <><Input aria-label="Sayıma ürün ara" placeholder="Ürün adı veya SKU ile ara" value={search} onChange={e => setSearch(e.target.value)} /><div className="max-h-72 space-y-2 overflow-y-auto">{matches.map(product => <form key={product.id} action={execute} className="flex flex-wrap items-center gap-2 border-b py-2"><input type="hidden" name="command" value="item" /><input type="hidden" name="id" value={selected.id} /><input type="hidden" name="productId" value={product.id} /><span className="min-w-40 flex-1">{product.name} · {product.sku} ({product.unit})</span><Input aria-label={`${product.name} miktarı`} className="w-28" name="quantity" type="number" min="0" step="any" inputMode="decimal" required /><Button type="submit" disabled={pending}><Plus className="size-4" />Ekle / Güncelle</Button></form>)}{search && !matches.length && <p>Ürün bulunamadı.</p>}</div></>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">{["Ürün / SKU", "Birim", "Kayıtlı Stok", "Sayılan", "Fark", "İşlem"].map(t => <th key={t} className="p-2">{t}</th>)}</tr></thead><tbody>{selected.items.map(item => <tr key={`${selected.id}-${item.productId}-${item.quantity}`} className="border-b"><td className="p-2">{item.name}<span className="block text-muted-foreground">{item.sku}</span></td><td className="p-2">{item.unit}</td><td className="p-2">{item.expected}</td><td className="p-2">{locked ? item.quantity : <form action={execute} className="flex gap-2"><input type="hidden" name="command" value="item" /><input type="hidden" name="id" value={selected.id} /><input type="hidden" name="productId" value={item.productId} /><Input aria-label={`${item.name} sayılan miktar`} name="quantity" type="number" step="any" min="0" inputMode="decimal" required defaultValue={item.quantity ?? ""} className="w-28" /><Button type="submit" size="icon" title="Miktarı kaydet" aria-label="Miktarı kaydet" disabled={pending}><Save className="size-4" /></Button></form>}</td><td className="p-2">{item.quantity === null ? "—" : item.quantity - item.expected}</td><td className="p-2">{!locked && <Button variant="outline" size="icon" title="Kalemi kaldır" aria-label={`${item.name} kalemini kaldır`} disabled={pending} onClick={() => command("remove", item.productId)}><Trash2 className="size-4" /></Button>}</td></tr>)}</tbody></table></div>
      {!selected.items.length && <p className="py-4 text-muted-foreground">Henüz sayım kalemi yok.</p>}
      {!locked && (confirming ? <div role="alert" className="flex flex-wrap items-center gap-3 border p-4"><p>Onaydan sonra kayıt değiştirilemez. Sayımı tamamlamak istiyor musunuz?</p><Button disabled={pending} onClick={() => command("approve")}>Onayla ve Kilitle</Button><Button variant="outline" onClick={() => setConfirming(false)}>Vazgeç</Button></div> : <Button disabled={pending || !selected.items.length} onClick={() => setConfirming(true)}><Check className="size-4" />Sayımı Tamamla</Button>)}
    </section>}
    <section><h2 className="mb-3 text-lg font-semibold">Tüm Sayımlar</h2><div className="divide-y">{rows.map(row => <Link key={row.id} href={`/warehouse/counts?id=${row.id}`} className="flex flex-wrap justify-between gap-2 py-4 hover:bg-muted"><span>{row.title}<small className="block">{row.warehouse} · {row.itemCount} kalem · {new Date(row.date).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</small></span><span>{row.status === "DRAFT" ? "Taslak · Düzenle" : "Onaylandı · İncele"}</span></Link>)}{!rows.length && <p>Henüz sayım kaydı yok.</p>}</div></section>
  </div>;
}
