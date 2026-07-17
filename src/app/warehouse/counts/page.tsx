import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { emptyOnMissingSchema } from "@/lib/supply-chain-data";
import { dateTime } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function StockCountsPage() {
  const rows = await emptyOnMissingSchema(
    prisma.stockCount.findMany({
      include: { warehouse: { select: { name: true } }, items: { select: { id: true, differenceQuantity: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    "StockCount",
  );

  return (
    <AppShell activeHref="/warehouse/counts" eyebrow="Merkez depo" title="Depo Sayımları">
      <div className="grid gap-3">
        {rows.map((row) => {
          const differences = row.items.filter((item) => item.differenceQuantity && item.differenceQuantity !== 0).length;

          return (
            <Card key={row.id} className="shadow-none">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2"><Badge>{row.status}</Badge><Badge variant="secondary">{row.countType}</Badge></div>
                  <p className="mt-2 font-semibold">{row.title}</p>
                  <p className="text-sm text-[#65705f]">{row.warehouse.name} · Kalem: {row.items.length} · Fark: {differences}</p>
                </div>
                <p className="text-sm text-[#65705f]">{dateTime(row.createdAt)}</p>
              </CardContent>
            </Card>
          );
        })}
        {!rows.length ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">Sayım kaydı yok.</p> : null}
      </div>
    </AppShell>
  );
}
