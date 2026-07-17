import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { emptyOnMissingSchema } from "@/lib/supply-chain-data";
import { dateTime } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function ProductMappingsPage() {
  const queue = await emptyOnMissingSchema(
    prisma.productMappingQueue.findMany({
      include: { suggestedProduct: { select: { name: true, sku: true } }, matchedProduct: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    "ProductMappingQueue",
  );
  const mappings = await emptyOnMissingSchema(
    prisma.externalProductMapping.findMany({
      include: { product: { select: { name: true, sku: true } }, supplier: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    "ExternalProductMapping",
  );

  return (
    <AppShell activeHref="/warehouse/product-mappings" eyebrow="Merkez depo" title="Ürün Eşleştirmeleri">
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <section className="space-y-3">
          <h2 className="font-semibold">Eşleştirme Bekleyenler</h2>
          {queue.map((item) => (
            <Card key={item.id} className="shadow-none">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2"><Badge>{item.status}</Badge><Badge variant="secondary">{item.sourceSystem}</Badge></div>
                <p className="mt-2 font-semibold">{item.externalName}</p>
                <p className="text-sm text-[#65705f]">{item.externalSku ?? "SKU yok"} · {item.externalBarcode ?? "Barkod yok"} · {dateTime(item.createdAt)}</p>
                <p className="mt-2 text-sm">Öneri: {item.suggestedProduct ? `${item.suggestedProduct.name} (${item.suggestedProduct.sku})` : "Yok"}</p>
              </CardContent>
            </Card>
          ))}
          {!queue.length ? <Empty text="Bekleyen eşleştirme yok." /> : null}
        </section>
        <section className="space-y-3">
          <h2 className="font-semibold">Aktif Eşleştirmeler</h2>
          {mappings.map((item) => (
            <Card key={item.id} className="shadow-none">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2"><Badge>{item.sourceSystem}</Badge>{item.isActive ? <Badge variant="secondary">Aktif</Badge> : <Badge variant="outline">Pasif</Badge>}</div>
                <p className="mt-2 font-semibold">{item.product.name}</p>
                <p className="text-sm text-[#65705f]">{item.product.sku} · {item.externalName} · {item.supplier?.name ?? "Tedarikçi yok"}</p>
              </CardContent>
            </Card>
          ))}
          {!mappings.length ? <Empty text="Aktif eşleştirme yok." /> : null}
        </section>
      </div>
    </AppShell>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">{text}</p>;
}
