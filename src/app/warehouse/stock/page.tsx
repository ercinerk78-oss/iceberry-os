import { adjustStock, createProduct } from "@/app/orders/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        salePrice: true,
        currency: true,
        minimumStockLevel: true,
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

  return (
    <AppShell activeHref="/warehouse/stock" eyebrow="Merkez depo" title="Stoklar">
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Yeni Ürün</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createProduct} className="grid gap-2 sm:grid-cols-2">
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
                <input name="salePrice" type="number" step="0.01" placeholder="Satış fiyatı" className={input} required />
                <input name="currency" defaultValue="TRY" className={input} />
                <input name="minimumStockLevel" type="number" defaultValue="0" className={input} />
                <textarea name="description" placeholder="Açıklama" className="rounded-lg border p-3 sm:col-span-2" />
                <Button className="sm:col-span-2">Ürünü Kaydet</Button>
              </form>
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

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-[#f1f4ef]">
              <tr>
                {["Ürün", "Kategori", "Depo", "Fiziksel", "Rezerve", "Kullanılabilir", "Minimum", "Satış Fiyatı"].map((header) => (
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
                        className={`border-t ${stock.availableQuantity <= product.minimumStockLevel ? "bg-rose-50" : ""}`}
                      >
                        <td className="p-3 font-semibold">
                          {product.name}
                          <div className="text-xs text-[#65705f]">{product.sku}</div>
                        </td>
                        <td className="p-3">{product.category.name}</td>
                        <td className="p-3">{stock.warehouse.name}</td>
                        <td className="p-3">{stock.quantity}</td>
                        <td className="p-3">{stock.reservedQuantity}</td>
                        <td className="p-3 font-semibold">{stock.availableQuantity}</td>
                        <td className="p-3">{product.minimumStockLevel}</td>
                        <td className="p-3">{money(product.salePrice, product.currency)}</td>
                      </tr>
                    ))
                  : [
                      <tr key={product.id} className="border-t">
                        <td className="p-3 font-semibold">{product.name}</td>
                        <td className="p-3">{product.category.name}</td>
                        <td colSpan={6} className="p-3 text-amber-700">
                          Henüz stok kaydı yok.
                        </td>
                      </tr>,
                    ],
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
