"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createPurchaseRequestAction, type ProcurementActionState } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; name: string };
type ProductOption = { id: string; name: string; sku: string; unit: string; purchasePrice: number };
type Line = { key: string; productId: string; quantity: number; estimatedUnitCost: number; notes: string };

const initialState: ProcurementActionState = { ok: false, message: "" };

export function PurchaseRequestForm({
  warehouses,
  suppliers,
  products,
}: {
  warehouses: Option[];
  suppliers: Option[];
  products: ProductOption[];
}) {
  const [state, action, pending] = useActionState(createPurchaseRequestAction, initialState);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => {
      if (line.key !== key) return line;
      const next = { ...line, ...patch };
      if (patch.productId) {
        const product = products.find((item) => item.id === patch.productId);
        if (product) next.estimatedUnitCost = product.purchasePrice;
      }
      return next;
    }));
  }

  return (
    <form action={action} className="space-y-4">
      <Card className="shadow-none">
        <CardHeader><CardTitle>Depodan Satın Alma Talebi Oluştur</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Talep Başlığı
            <input name="title" required placeholder="Örn. Merkez depo içecek stoğu" className="mt-1 h-10 w-full rounded-lg border px-3" />
          </label>
          <label className="text-sm">
            Talep Deposu
            <select name="warehouseId" required className="mt-1 h-10 w-full rounded-lg border px-3">
              <option value="">Depo seçin</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Önerilen Tedarikçi
            <select name="supplierId" className="mt-1 h-10 w-full rounded-lg border px-3">
              <option value="">Satın alma ekibi seçsin</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Öncelik
            <select name="priority" defaultValue="NORMAL" className="mt-1 h-10 w-full rounded-lg border px-3">
              <option value="LOW">Düşük</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Yüksek</option>
              <option value="URGENT">Acil</option>
            </select>
          </label>
          <label className="text-sm">
            İhtiyaç Tarihi
            <input name="neededByDate" type="date" className="mt-1 h-10 w-full rounded-lg border px-3" />
          </label>
          <label className="text-sm md:col-span-2">
            Talep Notu
            <textarea name="notes" placeholder="Depo ihtiyacını açıklayın" className="mt-1 min-h-20 w-full rounded-lg border p-3" />
          </label>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Talep Kalemleri</CardTitle>
          <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>
            <Plus className="size-4" /> Kalem Ekle
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line) => {
            const product = products.find((item) => item.id === line.productId);

            return (
              <div key={line.key} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.5fr_0.5fr_0.6fr_1fr_auto]">
                <label className="text-xs">
                  Ürün
                  <select name="productId" value={line.productId} onChange={(event) => updateLine(line.key, { productId: event.target.value })} className="mt-1 h-10 w-full rounded-lg border px-2">
                    <option value="">Ürün seçin</option>
                    {products.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.sku}</option>)}
                  </select>
                </label>
                <label className="text-xs">
                  Miktar
                  <input name="quantity" type="number" min="0" step="0.01" value={line.quantity || ""} onChange={(event) => updateLine(line.key, { quantity: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                </label>
                <label className="text-xs">
                  Tahmini Fiyat
                  <input name="estimatedUnitCost" type="number" min="0" step="0.01" value={line.estimatedUnitCost || ""} onChange={(event) => updateLine(line.key, { estimatedUnitCost: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                </label>
                <label className="text-xs">
                  Not
                  <input name="itemNotes" value={line.notes} onChange={(event) => updateLine(line.key, { notes: event.target.value })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                </label>
                <div className="flex items-end justify-between gap-2">
                  <p className="pb-2 text-xs text-[#65705f]">{product?.unit ?? "Birim"}</p>
                  <Button type="button" variant="outline" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {state.message ? (
            <p className={`rounded-lg p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {state.message}
            </p>
          ) : null}
          <Button disabled={pending}>{pending ? "Talep iletiliyor..." : "Talebi Satın Almaya Gönder"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}

function emptyLine(): Line {
  return { key: crypto.randomUUID(), productId: "", quantity: 0, estimatedUnitCost: 0, notes: "" };
}
