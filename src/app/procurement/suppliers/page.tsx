import { saveSupplierProductDirect } from "@/app/procurement/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { procurementMoney } from "@/lib/procurement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PurchaseSuppliersPage() {
  const [suppliers, products, supplierProducts] = await Promise.all([
    prisma.supplier.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { archivedAt: null, isActive: true }, select: { id: true, name: true, sku: true }, orderBy: { name: "asc" } }),
    prisma.supplierProduct.findMany({
      include: { supplier: { select: { name: true } }, product: { select: { name: true, sku: true, unit: true } } },
      orderBy: [{ isPreferred: "desc" }, { updatedAt: "desc" }],
      take: 100,
    }),
  ]);

  return (
    <AppShell activeHref="/procurement/suppliers" eyebrow="Merkez satın alma" title="Tedarikçiler">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Tedarikçi Kartları</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                  <tr>{["Tedarikçi", "Kod", "Vergi", "İletişim", "Durum", "Not"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="px-3 py-3 font-semibold">{supplier.name}</td>
                      <td className="px-3 py-3">{supplier.code ?? "-"}</td>
                      <td className="px-3 py-3">{supplier.taxNumber ?? "-"}<p className="text-xs text-[#65705f]">{supplier.taxOffice ?? ""}</p></td>
                      <td className="px-3 py-3">{supplier.phone ?? "-"}<p className="text-xs text-[#65705f]">{supplier.email ?? ""}</p></td>
                      <td className="px-3 py-3"><Badge variant="outline">{supplier.status}</Badge></td>
                      <td className="px-3 py-3">{supplier.notes ?? "-"}</td>
                    </tr>
                  ))}
                  {!suppliers.length ? <tr><td colSpan={6} className="p-10 text-center text-[#65705f]">Tedarikçi kaydı yok.</td></tr> : null}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Tedarikçi Ürün Fiyatları</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              {supplierProducts.map((item) => (
                <div key={item.id} className="rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.product.name}</p>
                      <p className="text-[#65705f]">{item.supplier.name} · {item.product.sku} · {item.product.unit}</p>
                    </div>
                    <div className="flex gap-2">
                      {item.isPreferred ? <Badge>Tercihli</Badge> : null}
                      <Badge variant="outline">{item.isActive ? "Aktif" : "Pasif"}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-[#65705f] md:grid-cols-4">
                    <span>Fiyat: <b>{procurementMoney(item.unitPrice, item.currency)}</b></span>
                    <span>MOQ: <b>{item.minimumOrderQuantity}</b></span>
                    <span>Termin: <b>{item.leadTimeDays ? `${item.leadTimeDays} gün` : "-"}</b></span>
                    <span>Vade: <b>{item.paymentTermDays ? `${item.paymentTermDays} gün` : "-"}</b></span>
                  </div>
                </div>
              ))}
              {!supplierProducts.length ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">Tedarikçi ürün fiyatı yok.</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit shadow-none">
          <CardHeader><CardTitle>Ürün-Tedarikçi Fiyatı Ekle</CardTitle></CardHeader>
          <CardContent>
            <form action={saveSupplierProductDirect} className="space-y-3 text-sm">
              <label className="block">
                Tedarikçi
                <select name="supplierId" required className="mt-1 h-10 w-full rounded-lg border px-3">
                  <option value="">Seçin</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
              <label className="block">
                Ürün
                <select name="productId" required className="mt-1 h-10 w-full rounded-lg border px-3">
                  <option value="">Seçin</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name} - {product.sku}</option>)}
                </select>
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <input name="supplierSku" placeholder="Tedarikçi SKU" className="h-10 rounded-lg border px-3" />
                <input name="supplierProductName" placeholder="Tedarikçi ürün adı" className="h-10 rounded-lg border px-3" />
                <input name="unitPrice" type="number" min="0" step="0.01" placeholder="Birim fiyat" className="h-10 rounded-lg border px-3" />
                <select name="currency" defaultValue="TRY" className="h-10 rounded-lg border px-3">
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input name="minimumOrderQuantity" type="number" min="1" step="0.01" defaultValue="1" placeholder="Minimum sipariş" className="h-10 rounded-lg border px-3" />
                <input name="orderIncrement" type="number" min="1" step="0.01" defaultValue="1" placeholder="Sipariş artışı" className="h-10 rounded-lg border px-3" />
                <input name="leadTimeDays" type="number" min="0" placeholder="Termin günü" className="h-10 rounded-lg border px-3" />
                <input name="paymentTermDays" type="number" min="0" placeholder="Vade günü" className="h-10 rounded-lg border px-3" />
              </div>
              <label className="flex items-center gap-2">
                <input name="isPreferred" type="checkbox" /> Tercihli tedarikçi olarak işaretle
              </label>
              <textarea name="notes" placeholder="Not" className="min-h-20 w-full rounded-lg border p-3" />
              <Button className="w-full">Kaydet</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
