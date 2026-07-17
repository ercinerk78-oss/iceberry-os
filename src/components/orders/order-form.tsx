"use client";

import { useActionState, useMemo, useState } from "react";

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
}: {
  products: Product[];
  owners: Owner[];
  warehouseId: string;
}) {
  const [state, action, pending] = useActionState(submitOrder, {
    ok: false,
    message: "",
  } as ActionResult);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState(owners[0]?.id ?? "");
  const items = useMemo(
    () => products.filter((product) => cart[product.id] > 0).map((product) => ({ ...product, quantity: cart[product.id] })),
    [cart, products],
  );
  const total = items.reduce((amount, item) => amount + item.salePrice * item.quantity * (1 + item.vatRate / 100), 0);

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <input type="hidden" name="items" value={JSON.stringify(items.map((item) => ({ productId: item.id, quantity: item.quantity })))} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="shadow-none">
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <p className="text-xs text-[#65705f]">
                {product.sku} · Kullanılabilir {product.available} {product.unit}
              </p>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-lg font-semibold">{money(product.salePrice)}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCart((current) => ({ ...current, [product.id]: Math.max(0, (current[product.id] || 0) - 1) }))}
                >
                  -
                </Button>
                <span className="w-10 text-center font-semibold">{cart[product.id] || 0}</span>
                <Button
                  type="button"
                  disabled={(cart[product.id] || 0) >= product.available}
                  onClick={() => setCart((current) => ({ ...current, [product.id]: (current[product.id] || 0) + 1 }))}
                >
                  +
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
              required
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.companyName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Şube
            <select name="branchId" className="mt-1 h-10 w-full rounded-lg border px-3">
              <option value="">Genel merkez siparişi</option>
              {owners
                .find((owner) => owner.id === selected)
                ?.branches.map((branch) => (
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
              <option value="CREATE_PARASUT_INVOICE">Paraşüt faturası oluştur</option>
              <option value="CREATE_LATER">Faturayı daha sonra oluştur</option>
              <option value="NOT_REQUIRED">Fatura gerekmiyor</option>
            </select>
          </label>
          <textarea name="notes" placeholder="Sipariş notu" className="min-h-20 w-full rounded-lg border p-3" />
          <div className="border-t pt-3">
            <div className="flex justify-between font-semibold">
              <span>Genel toplam</span>
              <span>{money(total)}</span>
            </div>
            <p className="mt-1 text-xs text-[#65705f]">KDV dahildir · {items.length} kalem</p>
          </div>
          {state.message ? (
            <p className={`rounded-lg p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {state.message}
            </p>
          ) : null}
          <Button className="w-full" disabled={pending || !items.length}>
            {pending ? "Gönderiliyor..." : "Siparişi Gönder"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
