"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createPurchaseOrderAction, type ProcurementActionState } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculatePurchaseLine, calculatePurchaseTotals, procurementMoney } from "@/lib/procurement";

type Option = { id: string; name: string };
type ProductOption = { id: string; name: string; sku: string; unit: string; purchasePrice: number; vatRate: number };
type Line = { key: string; productId: string; quantity: number; unitPrice: number; vatRate: number; discountRate: number; notes: string };

const initialState: ProcurementActionState = { ok: false, message: "" };

export function PurchaseOrderForm({
  suppliers,
  warehouses,
  products,
}: {
  suppliers: Option[];
  warehouses: Option[];
  products: ProductOption[];
}) {
  const [state, action, pending] = useActionState(createPurchaseOrderAction, initialState);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const totals = useMemo(() => {
    return calculatePurchaseTotals(lines
      .filter((line) => line.productId && line.quantity > 0)
      .map((line) => calculatePurchaseLine(line)));
  }, [lines]);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => {
      if (line.key !== key) return line;
      const next = { ...line, ...patch };
      if (patch.productId) {
        const product = products.find((item) => item.id === patch.productId);
        if (product) {
          next.unitPrice = product.purchasePrice;
          next.vatRate = product.vatRate;
        }
      }
      return next;
    }));
  }

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Sipariş Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Tedarikçi
              <select name="supplierId" required className="mt-1 h-10 w-full rounded-lg border px-3">
                <option value="">Tedarikçi seçin</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Teslim Deposu
              <select name="warehouseId" required className="mt-1 h-10 w-full rounded-lg border px-3">
                <option value="">Depo seçin</option>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Beklenen Teslim Tarihi
              <input name="expectedDeliveryDate" type="date" className="mt-1 h-10 w-full rounded-lg border px-3" />
            </label>
            <label className="text-sm">
              Para Birimi
              <select name="currency" defaultValue="TRY" className="mt-1 h-10 w-full rounded-lg border px-3">
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label className="text-sm">
              Vade (Gün)
              <input name="paymentTermDays" type="number" min="0" max="365" className="mt-1 h-10 w-full rounded-lg border px-3" />
            </label>
            <label className="text-sm">
              Dış Referans
              <input name="externalReference" placeholder="Teklif no, fatura no veya tedarikçi referansı" className="mt-1 h-10 w-full rounded-lg border px-3" />
            </label>
            <label className="text-sm md:col-span-2">
              Not
              <textarea name="notes" placeholder="Satın alma notu" className="mt-1 min-h-24 w-full rounded-lg border p-3" />
            </label>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ürün Kalemleri</CardTitle>
            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}>
              <Plus className="size-4" /> Kalem Ekle
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line) => {
              const product = products.find((item) => item.id === line.productId);
              const amounts = calculatePurchaseLine(line);

              return (
                <div key={line.key} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.4fr_0.5fr_0.7fr_0.5fr_0.5fr_0.8fr_auto]">
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
                    Birim Fiyat
                    <input name="unitPrice" type="number" min="0" step="0.01" value={line.unitPrice || ""} onChange={(event) => updateLine(line.key, { unitPrice: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                  </label>
                  <label className="text-xs">
                    KDV %
                    <input name="vatRate" type="number" min="0" max="100" step="0.01" value={line.vatRate} onChange={(event) => updateLine(line.key, { vatRate: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                  </label>
                  <label className="text-xs">
                    İskonto %
                    <input name="discountRate" type="number" min="0" max="100" step="0.01" value={line.discountRate} onChange={(event) => updateLine(line.key, { discountRate: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                  </label>
                  <label className="text-xs">
                    Not
                    <input name="itemNotes" value={line.notes} onChange={(event) => updateLine(line.key, { notes: event.target.value })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                  </label>
                  <div className="flex items-end justify-between gap-2">
                    <div className="pb-2 text-xs text-[#65705f]">
                      <p>{product?.unit ?? "Birim"}</p>
                      <b>{procurementMoney(amounts.lineTotal)}</b>
                    </div>
                    <Button type="button" variant="outline" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit shadow-none xl:sticky xl:top-24">
        <CardHeader>
          <CardTitle>Sipariş Özeti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Summary label="Ara Toplam" value={procurementMoney(totals.subtotal)} />
          <Summary label="İskonto" value={procurementMoney(totals.discountTotal)} />
          <Summary label="KDV" value={procurementMoney(totals.vatTotal)} />
          <Summary label="Genel Toplam" value={procurementMoney(totals.grandTotal)} strong />
          {state.message ? (
            <p className={`rounded-lg p-3 ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {state.message}
            </p>
          ) : null}
          <Button className="w-full" disabled={pending || totals.grandTotal <= 0}>
            {pending ? "Kaydediliyor..." : "Satın Alma Siparişi Oluştur"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between border-b pb-2 ${strong ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function emptyLine(): Line {
  return {
    key: crypto.randomUUID(),
    productId: "",
    quantity: 0,
    unitPrice: 0,
    vatRate: 20,
    discountRate: 0,
    notes: "",
  };
}
