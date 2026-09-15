"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createPurchaseOrderAction, type ProcurementActionState } from "@/app/procurement/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculatePurchaseLine, calculatePurchaseTotals, procurementMoney } from "@/lib/procurement";

type Option = { id: string; name: string };
type ProductOption = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  purchasePrice: number;
  vatRate: number;
  supplierProducts: { supplierId: string; unitPrice: number | null; isPreferred: boolean; supplierSku?: string | null; supplierProductName?: string | null }[];
};
type Line = { key: string; productId: string; productSearch: string; quantity: string; unitPrice: string; vatRate: string; discountRate: string; notes: string };

const initialState: ProcurementActionState = { ok: false, message: "" };

export function PurchaseOrderForm({
  suppliers,
  warehouses,
  products,
  sourceRequestId,
  sourceRequestNumber,
  initialSupplierId = "",
  initialWarehouseId = "",
  initialLines,
}: {
  suppliers: Option[];
  warehouses: Option[];
  products: ProductOption[];
  sourceRequestId?: string;
  sourceRequestNumber?: string;
  initialSupplierId?: string;
  initialWarehouseId?: string;
  initialLines?: Line[];
}) {
  const [state, action, pending] = useActionState(createPurchaseOrderAction, initialState);
  const [lines, setLines] = useState<Line[]>(initialLines?.length ? initialLines : [emptyLine()]);
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const selectableProducts = useMemo(() => {
    if (!supplierId) return [];
    return products.filter((product) => product.supplierProducts.some((mapping) => mapping.supplierId === supplierId));
  }, [products, supplierId]);
  const totals = useMemo(() => {
    return calculatePurchaseTotals(lines
      .filter((line) => line.productId && parseDecimal(line.quantity) > 0)
      .map((line) => calculatePurchaseLine({
        quantity: parseDecimal(line.quantity),
        unitPrice: parseDecimal(line.unitPrice),
        vatRate: parseDecimal(line.vatRate),
        discountRate: parseDecimal(line.discountRate),
      })));
  }, [lines]);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => {
      if (line.key !== key) return line;
      const next = { ...line, ...patch };
      if (patch.productId) {
        const product = products.find((item) => item.id === patch.productId);
        if (product) {
          next.productSearch = `${product.name} - ${productLabel(product, supplierId)}`;
          next.unitPrice = formatInputNumber(lastSupplierPrice(product, supplierId) ?? product.purchasePrice);
          next.vatRate = formatInputNumber(product.vatRate);
        }
      }
      return next;
    }));
  }

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[1fr_360px]">
      {sourceRequestId ? <input type="hidden" name="sourceRequestId" value={sourceRequestId} /> : null}
      <div className="space-y-4">
        {sourceRequestNumber ? (
          <div className="rounded-xl border border-[#d9e8d2] bg-[#f8faf6] p-4 text-sm text-[#2f3a2b]">
            Bu sipariş <b>{sourceRequestNumber}</b> numaralı depo talebinden oluşturuluyor.
          </div>
        ) : null}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Sipariş Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Tedarikçi
              <select
                name="supplierId"
                required
                value={supplierId}
                onChange={(event) => {
                  setSupplierId(event.target.value);
                  setLines((current) => current.map((line) => ({ ...line, productId: "", productSearch: "", unitPrice: "", vatRate: "20" })));
                }}
                className="mt-1 h-10 w-full rounded-lg border px-3"
              >
                <option value="">Tedarikçi seçin</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
              {supplierId && !selectableProducts.length ? (
                <span className="mt-1 block text-xs text-amber-700">Bu tedarikçiye bağlı aktif ürün bulunmuyor.</span>
              ) : null}
            </label>
            <label className="text-sm">
              Teslim Deposu
              <select name="warehouseId" required defaultValue={initialWarehouseId} className="mt-1 h-10 w-full rounded-lg border px-3">
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
              const productOptions = productMatches(selectableProducts, line.productSearch, supplierId);
              const amounts = calculatePurchaseLine({
                quantity: parseDecimal(line.quantity),
                unitPrice: parseDecimal(line.unitPrice),
                vatRate: parseDecimal(line.vatRate),
                discountRate: parseDecimal(line.discountRate),
              });

              return (
                <div key={line.key} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[1.4fr_0.5fr_0.7fr_0.5fr_0.5fr_0.8fr_auto]">
                  <div className="relative text-xs">
                    Ürün
                    <input
                      value={line.productSearch}
                      onChange={(event) => updateLine(line.key, { productSearch: event.target.value, productId: "" })}
                      placeholder={supplierId ? "Tedarikçi ürünlerinde ara" : "Önce tedarikçi seçin"}
                      disabled={!supplierId}
                      className="mt-1 h-10 w-full rounded-lg border px-2 disabled:bg-[#f3f4ef]"
                    />
                    <input type="hidden" name="productId" value={line.productId} />
                    {supplierId && line.productSearch && !line.productId ? (
                      <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-white p-1 shadow-lg">
                        {productOptions.slice(0, 12).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateLine(line.key, { productId: item.id })}
                            className="block w-full rounded-md px-3 py-2 text-left hover:bg-[#f8faf6]"
                          >
                            <span className="font-medium">{item.name}</span>
                            <span className="block text-[11px] text-[#65705f]">{productLabel(item, supplierId)}</span>
                          </button>
                        ))}
                        {!productOptions.length ? <p className="px-3 py-2 text-[#65705f]">Bu tedarikçide ürün bulunamadı.</p> : null}
                      </div>
                    ) : null}
                  </div>
                  <label className="text-xs">
                    Miktar
                    <input name="quantity" type="text" inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                  </label>
                  <label className="text-xs">
                    Birim Fiyat
                    <input name="unitPrice" type="text" inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                  </label>
                  <label className="text-xs">
                    KDV %
                    <input name="vatRate" type="text" inputMode="decimal" value={line.vatRate} onChange={(event) => updateLine(line.key, { vatRate: event.target.value })} className="mt-1 h-10 w-full rounded-lg border px-2" />
                  </label>
                  <label className="text-xs">
                    İskonto %
                    <input name="discountRate" type="text" inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.key, { discountRate: event.target.value })} className="mt-1 h-10 w-full rounded-lg border px-2" />
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
    productSearch: "",
    quantity: "",
    unitPrice: "",
    vatRate: "20",
    discountRate: "0",
    notes: "",
  };
}

function productLabel(product: ProductOption, supplierId?: string) {
  const mapping = supplierId ? product.supplierProducts.find((item) => item.supplierId === supplierId) : null;
  const supplierSku = mapping?.supplierSku ? `${mapping.supplierSku} · ` : "";
  const supplierName = mapping?.supplierProductName ? `${mapping.supplierProductName} · ` : "";
  return `${supplierSku}${supplierName}${product.sku} · ${product.unit}`;
}

function productMatches(products: ProductOption[], query: string, supplierId?: string) {
  const text = query.trim().toLocaleLowerCase("tr-TR");
  if (!text) return products.slice(0, 12);
  return products.filter((product) => {
    const mapping = supplierId ? product.supplierProducts.find((item) => item.supplierId === supplierId) : null;
    return `${product.name} ${product.sku} ${mapping?.supplierSku ?? ""} ${mapping?.supplierProductName ?? ""}`.toLocaleLowerCase("tr-TR").includes(text);
  });
}

function lastSupplierPrice(product: ProductOption, supplierId?: string) {
  if (!supplierId) return null;
  const mapping = product.supplierProducts.find((item) => item.supplierId === supplierId);
  return mapping?.unitPrice ?? null;
}

function parseDecimal(value: string) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInputNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return String(value).replace(".", ",");
}
