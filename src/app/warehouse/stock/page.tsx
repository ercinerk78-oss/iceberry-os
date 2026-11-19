import Link from "next/link";

import { adjustStock, archiveProduct, saveMinimumStockLevel } from "@/app/orders/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductCreateForm } from "@/components/warehouse/product-create-form";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

const input = "h-10 rounded-lg border px-3";

export default async function StockPage() {
  const [warehouses, categories, products] = await Promise.all([
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.productCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { orderIndex: "asc" },
    }),
    prisma.product.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        salePrice: true,
        purchasePrice: true,
        currency: true,
        minimumStockLevel: true,
        unit: true,
        category: { select: { name: true } },
        stocks: {
          select: {
            id: true,
            warehouseId: true,
            quantity: true,
            reservedQuantity: true,
            availableQuantity: true,
            warehouse: { select: { name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const totals = new Map<string, { purchase: number; sale: number }>();
  for (const product of products) {
    const quantity = product.stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const total = totals.get(product.currency) ?? { purchase: 0, sale: 0 };
    total.purchase += quantity * product.purchasePrice;
    total.sale += quantity * product.salePrice;
    totals.set(product.currency, total);
  }

  return (
    <AppShell activeHref="/warehouse/stock" eyebrow="Merkez depo" title="Stoklar" action={<Button asChild variant="outline"><Link href="/warehouse/shipments?view=open">Eksik Sevk Takibi</Link></Button>}>
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Yeni Ürün</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductCreateForm categories={categories} />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Stok Girişi / Düzeltme</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={adjustStock} className="grid gap-3">
                <select name="warehouseId" className={input}>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                <select name="productId" className={input} required>
                  <option value="">Ürün seçin</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
                <input name="quantity" type="number" min="0" step="0.01" placeholder="Yeni fiziksel stok" className={input} required />
                <Button>Stoku Güncelle</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border bg-white">
          <div className="flex flex-col gap-1 border-b border-[#edf0e9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-[#17201b]">Aktif Ürün Listesi</h2>
              <p className="text-sm text-[#65705f]">Pasife alınan ürünler bu listede ve ürün seçimlerinde görünmez.</p>
            </div>
            <div className="rounded-lg bg-[#ecfbdc] px-3 py-2 text-sm font-semibold text-[#2f5f20]">
              Toplam aktif ürün: {products.length}
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-[#f1f4ef]">
              <tr>
                {["Ürün", "SKU (Ürün Stok Kodu)", "Kategori", "Depo", "Fiziksel", "Rezerve", "Kullanılabilir", "Minimum", "Alış Fiyatı", "Alıştan Stok Değeri", "Satış Fiyatı", "Satıştan Stok Değeri", "Etiket", "İşlem"].map((header) => (
                  <th key={header} className="p-3 text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.flatMap((product) =>
                product.stocks.length
                  ? product.stocks.map((stock) => (
                      <tr
                        key={stock.id}
                        className={`border-t ${product.minimumStockLevel > 0 && stock.availableQuantity <= product.minimumStockLevel ? "bg-rose-50" : ""}`}
                      >
                        <td className="p-3 font-semibold">
                          {product.name}
                        </td>
                        <td className="p-3">{product.sku}</td>
                        <td className="p-3">{product.category.name}</td>
                        <td className="p-3">{stock.warehouse.name}</td>
                        <td className="p-3">{stock.quantity}</td>
                        <td className="p-3">{stock.reservedQuantity}</td>
                        <td className="p-3 font-semibold">{stock.availableQuantity}</td>
                        <td className="p-3">
                          <MinimumStockForm product={product} />
                          {product.minimumStockLevel > 0 && stock.availableQuantity <= product.minimumStockLevel ? <p className="mt-1 text-xs font-semibold text-rose-700">Minimum stok uyarısı</p> : null}
                        </td>
                        <td className="p-3">{money(product.purchasePrice, product.currency)}</td>
                        <td className="p-3">{money(stock.quantity * product.purchasePrice, product.currency)}</td>
                        <td className="p-3">{money(product.salePrice, product.currency)}</td>
                        <td className="p-3">{money(stock.quantity * product.salePrice, product.currency)}</td>
                        <td className="p-3">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/warehouse/stock/labels/${product.id}`}>Etiket</Link>
                          </Button>
                        </td>
                        <td className="p-3">
                          <form action={archiveProduct.bind(null, product.id)}>
                            <Button size="sm" variant="destructive">Pasife Al</Button>
                          </form>
                        </td>
                      </tr>
                    ))
                  : [
                      <tr key={product.id} className="border-t">
                        <td className="p-3 font-semibold">{product.name}</td>
                        <td className="p-3">{product.sku}</td>
                        <td className="p-3">{product.category.name}</td>
                        <td colSpan={4} className="p-3 text-amber-700">Henüz stok kaydı yok.</td>
                        <td className="p-3"><MinimumStockForm product={product} /></td>
                        <td className="p-3">{money(product.purchasePrice, product.currency)}</td>
                        <td className="p-3">{money(0, product.currency)}</td>
                        <td className="p-3">{money(product.salePrice, product.currency)}</td>
                        <td className="p-3">{money(0, product.currency)}</td>
                        <td />
                        <td className="p-3">
                          <form action={archiveProduct.bind(null, product.id)}>
                            <Button size="sm" variant="destructive">Pasife Al</Button>
                          </form>
                        </td>
                      </tr>,
                    ],
              )}
            </tbody>
            <tfoot className="border-t bg-[#f1f4ef] font-semibold">
              {Array.from(totals, ([currency, total]) => (
                <tr key={currency}>
                  <th colSpan={9} scope="row" className="p-3 text-left">Toplam stok değeri ({currency})</th>
                  <td className="p-3">{money(total.purchase, currency)}</td>
                  <td />
                  <td className="p-3">{money(total.sale, currency)}</td>
                  <td colSpan={2} />
                </tr>
              ))}
            </tfoot>
          </table>
          </div>
          <p className="px-4 py-3 text-sm text-[#65705f]">Değerler fiziksel stok ve ürün kartındaki birim fiyatlarla hesaplanır. Minimum değer 0 ise uyarı kapalıdır.</p>
        </div>
      </div>
    </AppShell>
  );
}

function MinimumStockForm({ product }: { product: { id: string; name: string; minimumStockLevel: number } }) {
  return (
    <form action={saveMinimumStockLevel.bind(null, product.id)} className="flex items-center gap-2">
      <input name="minimumStockLevel" aria-label={`${product.name} minimum stok`} type="number" min="0" step="any" required defaultValue={product.minimumStockLevel} className="h-8 w-20 rounded border px-2" />
      <Button size="sm" variant="outline">Kaydet</Button>
    </form>
  );
}
