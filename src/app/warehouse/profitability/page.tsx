import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { profitability } from "@/lib/stock-profitability";
import { money } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

type Period = {
  month: number;
  currency: string | null;
  entries: number;
  purchase: number;
  netSales: number;
  cost: number;
  incompleteSales: number;
};

export default async function ProfitabilityPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const currentYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Istanbul" }).format());
  const selected = Number((await searchParams).year);
  const year = Number.isInteger(selected) && selected >= 2000 && selected <= currentYear ? selected : currentYear;
  const from = new Date(`${year}-01-01T00:00:00+03:00`);
  const to = new Date(`${year + 1}-01-01T00:00:00+03:00`);
  const monthly = await prisma.$queryRaw<Period[]>`
    SELECT extract(month FROM "occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::int AS month,
      "valuationCurrency" AS currency,
      COALESCE(sum(quantity) FILTER (WHERE "movementType" = 'PURCHASE_RECEIPT'), 0) AS entries,
      COALESCE(sum("totalCost") FILTER (WHERE "movementType" = 'PURCHASE_RECEIPT' AND "valuationCurrency" IS NOT NULL), 0) AS purchase,
      COALESCE(sum("netSalesAmount"), 0) AS "netSales",
      COALESCE(sum("totalCost") FILTER (WHERE "netSalesAmount" IS NOT NULL), 0) AS cost,
      count(*) FILTER (WHERE "movementType" = 'SHIPMENT_OUT' AND ("totalCost" IS NULL OR "netSalesAmount" IS NULL))::int AS "incompleteSales"
    FROM "StockMovement"
    WHERE "occurredAt" >= ${from} AND "occurredAt" < ${to}
      AND ("movementType" = 'PURCHASE_RECEIPT' OR "netSalesAmount" IS NOT NULL OR ("movementType" = 'SHIPMENT_OUT' AND "valuationCurrency" IS NULL))
    GROUP BY 1, 2 ORDER BY 1, 2
  `;
  const yearly = new Map<string | null, Period>();
  for (const period of monthly) {
    const total = yearly.get(period.currency);
    if (!total) yearly.set(period.currency, { ...period, month: 0 });
    else for (const key of ["entries", "purchase", "netSales", "cost", "incompleteSales"] as const) total[key] += period[key];
  }

  return (
    <AppShell activeHref="/warehouse/profitability" eyebrow="Depo ve Lojistik" title="Stok ve Kârlılık Analizi">
      <div className="space-y-5">
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Yıl
            <input name="year" type="number" min="2000" max={currentYear} defaultValue={year} required className="mt-1 block h-9 w-28 rounded border px-2" />
          </label>
          <Button type="submit">Filtrele</Button>
        </form>
        <p className="text-sm text-[#65705f]">KDV hariç fiili sevkler esas alınır. Açılış maliyeti ürün kartındaki alış fiyatından tahmin edilir. Geçmişte maliyeti veya satış tutarı kaydedilmemiş çıkışlar eksik olarak gösterilir.</p>
        <ProfitTable title="Yıllık Toplam" periods={[...yearly.values()]} year={year} />
        <ProfitTable title="Aylık Dağılım" periods={monthly} year={year} />
      </div>
    </AppShell>
  );
}

function ProfitTable({ title, periods, year }: { title: string; periods: Period[]; year: number }) {
  const number = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
  return (
    <section className="rounded-lg border bg-white">
      <h2 className="px-4 py-3 font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-[#f1f4ef]"><tr>
            {["Dönem", "Para Birimi", "Mal Kabul Miktarı", "Alış Tutarı", "Net Satış", "Sevk Maliyeti", "Brüt Kâr", "Marj", "Eksik Sevk Kaydı"].map((label) => <th key={label} scope="col" className="p-3 text-left">{label}</th>)}
          </tr></thead>
          <tbody>
            {periods.map((period) => {
              const { grossProfit, margin } = profitability(period.netSales, period.cost, period.incompleteSales);
              const format = (value: number | null) => period.currency && value !== null ? money(value, period.currency) : "—";
              return <tr key={`${period.month}:${period.currency}`} className="border-t">
                <th scope="row" className="p-3 text-left">{period.month ? new Intl.DateTimeFormat("tr-TR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, period.month - 1, 1))) : year}</th>
                <td className="p-3">{period.currency ?? "Bilinmiyor"}</td>
                <td className="p-3">{number.format(period.entries)}</td>
                <td className="p-3">{format(period.purchase)}</td>
                <td className="p-3">{format(period.netSales)}</td>
                <td className="p-3">{format(period.incompleteSales ? null : period.cost)}</td>
                <td className="p-3">{format(grossProfit)}</td>
                <td className="p-3">{period.currency && margin !== null ? `%${number.format(margin)}` : "—"}</td>
                <td className="p-3">{period.incompleteSales}</td>
              </tr>;
            })}
            {!periods.length ? <tr><td colSpan={9} className="border-t p-4 text-[#65705f]">Bu dönemde stok hareketi bulunamadı.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
