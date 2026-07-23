import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { emptyOnMissingSchema } from "@/lib/supply-chain-data";
import { dateTime } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function GoodsReceiptsPage() {
  const rows = await emptyOnMissingSchema(
    prisma.goodsReceipt.findMany({
      include: {
        warehouse: { select: { name: true } },
        supplier: { select: { name: true } },
        purchaseOrder: { select: { orderNumber: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    "GoodsReceipt",
  );
  const waiting = rows.filter((row) => ["PENDING_MAPPING", "PENDING_RECEIPT", "IN_PROGRESS"].includes(row.status)).length;
  const discrepancy = rows.filter((row) => row.discrepancyStatus !== "NONE").length;
  const completed = rows.filter((row) => ["COMPLETED", "APPROVED"].includes(row.status)).length;

  return (
    <AppShell activeHref="/warehouse/goods-receipts" eyebrow="Merkez depo" title="Bekleyen Mal Kabuller">
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-3">
          <Metric title="Bekleyen" value={waiting} />
          <Metric title="Fark İncelemesi" value={discrepancy} />
          <Metric title="Tamamlanan" value={completed} />
        </section>
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="shadow-none">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{row.status}</Badge>
                    <Badge variant="secondary">{row.sourceSystem}</Badge>
                    {row.discrepancyStatus !== "NONE" ? <Badge variant="outline">{row.discrepancyStatus}</Badge> : null}
                  </div>
                  <p className="mt-2 font-semibold">{row.invoiceNumber ?? row.externalDocumentId ?? row.id}</p>
                  <p className="text-sm text-[#65705f]">
                    {row.warehouse.name} · {row.supplier?.name ?? "Tedarikçi yok"} · {row.purchaseOrder?.orderNumber ?? "PO bağlantısı yok"} · Kalem: {row.items.length}
                  </p>
                </div>
                <p className="text-sm text-[#65705f]">{dateTime(row.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
          {!rows.length ? <Empty text="Bekleyen mal kabul kaydı yok." /> : null}
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-sm text-[#65705f]">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-semibold">{value}</p></CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-10 text-center text-sm text-[#65705f]">{text}</p>;
}
