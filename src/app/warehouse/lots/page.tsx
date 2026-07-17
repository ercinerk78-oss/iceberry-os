import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { emptyOnMissingSchema } from "@/lib/supply-chain-data";
import { formatDate } from "@/lib/franchise";

export const dynamic = "force-dynamic";

export default async function LotsPage() {
  const rows = await emptyOnMissingSchema(
    prisma.inventoryLot.findMany({
      include: { warehouse: { select: { name: true } }, product: { select: { name: true, sku: true } }, supplier: { select: { name: true } } },
      orderBy: [{ expirationDate: "asc" }, { createdAt: "desc" }],
      take: 150,
    }),
    "InventoryLot",
  );
  const expired = rows.filter((row) => row.expirationDate && row.expirationDate < new Date()).length;
  const blocked = rows.filter((row) => ["BLOCKED", "QUARANTINED", "EXPIRED"].includes(row.status)).length;

  return (
    <AppShell activeHref="/warehouse/lots" eyebrow="Merkez depo" title="Lot ve SKT">
      <div className="space-y-4">
        <section className="grid gap-3 md:grid-cols-3">
          <Metric title="Aktif Lot" value={rows.filter((row) => row.status === "ACTIVE").length} />
          <Metric title="Süresi Geçen" value={expired} />
          <Metric title="Blokeli/Karantina" value={blocked} />
        </section>
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="shadow-none">
              <CardContent className="grid gap-2 p-4 md:grid-cols-[1fr_0.8fr_0.6fr_0.5fr] md:items-center">
                <div>
                  <p className="font-semibold">{row.product.name}</p>
                  <p className="text-sm text-[#65705f]">{row.product.sku} · Lot {row.lotNumber}</p>
                </div>
                <p className="text-sm">{row.warehouse.name} · {row.supplier?.name ?? "Tedarikçi yok"}</p>
                <p className="text-sm">SKT: {formatDate(row.expirationDate)}</p>
                <Badge>{row.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {!rows.length ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">Lot kaydı yok.</p> : null}
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <div className="rounded-lg border bg-white p-4"><p className="text-sm text-[#65705f]">{title}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
