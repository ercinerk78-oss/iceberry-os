"use client";

import { useActionState } from "react";

import { createProduct, type ActionResult } from "@/app/orders/actions";
import { Button } from "@/components/ui/button";

type CategoryOption = {
  id: string;
  name: string;
};

const initialState: ActionResult = { ok: false, message: "" };
const input = "h-10 rounded-lg border px-3";

export function ProductCreateForm({ categories }: { categories: CategoryOption[] }) {
  const [state, action, pending] = useActionState(createProduct, initialState);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input name="name" placeholder="Ürün adı" className={input} required />
      <input name="sku" placeholder="SKU" className={input} required />
      <input name="barcode" placeholder="Barkod" className={input} />
      <select name="categoryId" className={input} required>
        <option value="">Kategori</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <input name="unit" defaultValue="Adet" className={input} />
      <input name="vatRate" type="number" defaultValue="20" className={input} />
      <input name="purchasePrice" type="number" step="0.01" placeholder="Alış fiyatı" className={input} />
      <input name="salePrice" type="number" step="0.01" placeholder="Satış fiyatı" className={input} />
      <input name="currency" defaultValue="TRY" className={input} />
      <input name="minimumStockLevel" type="number" defaultValue="0" className={input} />
      <textarea name="description" placeholder="Açıklama" className="rounded-lg border p-3 sm:col-span-2" />
      {state.message ? (
        <p className={`rounded-lg p-3 text-sm sm:col-span-2 ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
      <Button className="sm:col-span-2" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Ürünü Kaydet"}
      </Button>
    </form>
  );
}
