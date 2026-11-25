"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { salesUnitFactor } from "@/lib/order-quantity";
import { orderSelectionQuantity } from "@/lib/order-selection-feedback";

type Props = {
  product: { id: string; name: string; sku: string; available: number; unit: string; salesUnitFactor: number };
  quantity: number;
  shortage: boolean;
  recentlyAdded: boolean;
  onAdd: () => void;
  onShortageChange: (checked: boolean) => void;
};

export function ProductSearchResult({ product, quantity, shortage, recentlyAdded, onAdd, onShortageChange }: Props) {
  return <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 transition-colors motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_auto_auto] ${recentlyAdded ? "bg-emerald-50" : ""}`}>
    <div className="min-w-0 break-words text-sm">
      <b>{product.name}</b>
      <p>{product.sku} · {product.available} {product.unit}</p>
      <p className="mt-1 min-h-5 text-xs font-semibold text-emerald-800">
        {quantity > 0 ? `Siparişte: ${orderSelectionQuantity(quantity, product.salesUnitFactor, product.unit)}` : null}
      </p>
    </div>
    <label className="col-span-2 row-start-2 flex items-center gap-2 text-sm text-rose-700 sm:col-span-1 sm:row-start-auto">
      <input type="checkbox" checked={shortage} onChange={event => onShortageChange(event.target.checked)} />Eksik Sevk
    </label>
    <Button type="button" variant="outline" className={`col-start-2 row-start-1 h-10 w-10 p-0 sm:col-start-3 ${recentlyAdded ? "border-emerald-600 bg-emerald-100 text-emerald-800" : ""}`}
      title={recentlyAdded ? "Eklendi · Tekrar ekle" : `${product.name}: ${salesUnitFactor(product.salesUnitFactor)} ${product.unit} ekle`}
      aria-label={`${product.name} ekle`} onClick={onAdd}>
      {recentlyAdded ? <Check className="size-4" /> : <Plus className="size-4" />}
    </Button>
  </div>;
}
