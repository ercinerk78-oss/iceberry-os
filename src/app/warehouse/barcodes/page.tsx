import Link from "next/link";

import { saveProductBarcode, saveProductUnit } from "@/app/orders/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const input = "h-10 rounded-lg border px-3";

export default async function BarcodesPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true, archivedAt: null },
    select: {
      id: true, name: true, unit: true, barcode: true,
        units: {
          select: { id: true, code: true, name: true, conversionFactor: true, isBase: true, isPurchaseDefault: true, isShipmentDefault: true },
          orderBy: [{ isBase: "desc" }, { conversionFactor: "asc" }],
        },
        barcodes: {
          where: { isActive: true },
          select: { id: true, barcode: true, unitName: true, conversionFactor: true, barcodeType: true },
          orderBy: { createdAt: "desc" },
        },
    },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell activeHref="/warehouse/barcodes" eyebrow="Merkez depo" title="Barkod ve Birimler">
        <section className="grid gap-4 xl:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id} className="shadow-none">
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <p className="text-sm text-[#65705f]">
                  Ana birim: {product.unit} · Ana barkod: {product.barcode ?? "Yok"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-[#f8faf6] p-3">
                  <h3 className="font-semibold">Tanımlı Birimler</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    {product.units.map((unit) => (
                      <div key={unit.id} className="flex flex-wrap justify-between gap-2 rounded border bg-white p-2">
                        <span><b>{unit.name}</b> ({unit.code})</span>
                        <span>{unit.conversionFactor} {product.unit}</span>
                      </div>
                    ))}
                    {!product.units.length ? <p className="text-[#65705f]">Henüz ek birim tanımlı değil.</p> : null}
                  </div>
                </div>

                <Button asChild variant="outline"><Link href={`/warehouse/stock/labels/${product.id}`}>Barkod Etiketi</Link></Button>
                <form action={saveProductUnit} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <input name="name" placeholder="Birim adı: Koli" className={input} required />
                  <input name="code" placeholder="Kod: KOLI" className={input} required />
                  <input name="conversionFactor" type="number" min="0.01" step="0.01" placeholder={`Kaç ${product.unit}?`} className={input} required />
                  <input name="notes" placeholder="Not" className={input} />
                  <label className="flex items-center gap-2 text-sm">
                    <input name="isPurchaseDefault" type="checkbox" />
                    Satın alma varsayılanı
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input name="isShipmentDefault" type="checkbox" />
                    Sevkiyat varsayılanı
                  </label>
                  <Button className="sm:col-span-2">Birim Kaydet</Button>
                </form>

                <div className="rounded-lg border bg-[#f8faf6] p-3">
                  <h3 className="font-semibold">Tanımlı Barkodlar</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    {product.barcodes.map((barcode) => (
                      <div key={barcode.id} className="flex flex-wrap justify-between gap-2 rounded border bg-white p-2">
                        <span><b>{barcode.barcode}</b> · {barcode.unitName}</span>
                        <span>{barcode.conversionFactor} {product.unit}</span>
                      </div>
                    ))}
                    {!product.barcodes.length ? <p className="text-[#65705f]">Ek barkod tanımlı değil.</p> : null}
                  </div>
                </div>

                <form action={saveProductBarcode} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <input name="barcode" placeholder="Barkod" className={input} required />
                  <select name="productUnitId" className={input} defaultValue="">
                    <option value="">Birim seçmeden kaydet</option>
                    {product.units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} - {unit.conversionFactor} {product.unit}
                      </option>
                    ))}
                  </select>
                  <input name="unitName" placeholder="Birim adı: Koli" className={input} />
                  <input name="conversionFactor" type="number" min="0.01" step="0.01" placeholder={`Kaç ${product.unit}?`} className={input} required />
                  <select name="barcodeType" className={input} defaultValue="UNIT">
                    <option value="UNIT">Birim barkodu</option>
                    <option value="SUPPLIER">Tedarikçi barkodu</option>
                    <option value="INTERNAL">Depo iç etiketi</option>
                  </select>
                  <input name="notes" placeholder="Not" className={input} />
                  <Button className="sm:col-span-2">Barkod Kaydet</Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </section>
    </AppShell>
  );
}
