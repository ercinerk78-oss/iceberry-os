import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Download, LineChart, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { approveRevenue, createBranchRevenue, lockRevenue, rejectRevenue } from "@/app/branch-revenues/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accessibleBranchIds } from "@/lib/branch-access";
import {
  FINAL_REVENUE_STATUSES,
  REVENUE_CURRENCIES,
  REVENUE_SOURCE_LABELS,
  REVENUE_SOURCES,
  REVENUE_STATUS_LABELS,
  formatMoney,
  formatPercent,
  monthPeriod,
  percentChange,
  previousMonth,
  realizationRate,
} from "@/lib/branch-revenue";
import { BRANCH_CONCEPTS, BRANCH_OWNERSHIP_TYPES, BRANCH_STATUSES, label } from "@/lib/franchise";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
type RevenueRecordForPage = Prisma.BranchRevenueRecordGetPayload<{
  include: { enteredBy: { select: { name: true } } };
}>;
type RevenueRowData = {
  branch: Prisma.BranchGetPayload<Record<string, never>>;
  current?: RevenueRecordForPage;
  previous?: RevenueRecordForPage;
  actual: number;
  previousActual: number;
  change: number;
  changeRate: number;
  targetRate: number | null;
};

const get = (params: Params, key: string) => (typeof params[key] === "string" ? params[key] : "");
const finalStatuses = [...FINAL_REVENUE_STATUSES];

export default async function BranchRevenuesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(get(params, "year") || now.getFullYear());
  const month = Number(get(params, "month") || now.getMonth() + 1);
  const q = get(params, "q");
  const city = get(params, "city");
  const ownershipType = get(params, "ownershipType");
  const concept = get(params, "concept");
  const status = get(params, "status");
  const filter = get(params, "filter");
  const branchIds = await accessibleBranchIds();
  const { periodStart } = monthPeriod(year, month);
  const prev = previousMonth(year, month);
  const prevPeriod = monthPeriod(prev.year, prev.month);
  const branchWhere: Prisma.BranchWhereInput = {
    archivedAt: null,
    ...(branchIds ? { id: { in: branchIds } } : {}),
    ...(q ? { OR: [{ branchName: { contains: q } }, { branchCode: { contains: q } }, { city: { contains: q } }] } : {}),
    ...(city ? { city } : {}),
    ...(ownershipType ? { ownershipType } : {}),
    ...(concept ? { concept } : {}),
    ...(status ? { status } : {}),
  };

  const [branches, currentRecords, previousRecords, yearRecords, cities] = await Promise.all([
    prisma.branch.findMany({
      where: branchWhere,
      include: {
        revenueRecords: {
          where: { periodType: "MONTHLY", periodStart },
          include: { enteredBy: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { branchName: "asc" },
      take: 200,
    }),
    prisma.branchRevenueRecord.findMany({
      where: { periodType: "MONTHLY", periodStart, branch: branchWhere },
      include: { enteredBy: { select: { name: true } } },
    }),
    prisma.branchRevenueRecord.findMany({
      where: { periodType: "MONTHLY", periodStart: prevPeriod.periodStart, branch: branchWhere },
      include: { enteredBy: { select: { name: true } } },
    }),
    prisma.branchRevenueRecord.findMany({
      where: { periodType: "MONTHLY", year, branch: branchWhere, status: { in: finalStatuses } },
      include: { enteredBy: { select: { name: true } } },
      orderBy: { periodStart: "asc" },
    }),
    prisma.branch.findMany({ where: { archivedAt: null }, select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
  ]);

  const previousByBranch = new Map(previousRecords.map((record) => [record.branchId, record]));
  const rows = branches.map((branch) => {
    const current = branch.revenueRecords[0] as RevenueRecordForPage | undefined;
    const previous = previousByBranch.get(branch.id);
    const actual = current && finalStatuses.includes(current.status as typeof finalStatuses[number]) ? current.grossRevenue : 0;
    const previousActual = previous && finalStatuses.includes(previous.status as typeof finalStatuses[number]) ? previous.grossRevenue : 0;
    const change = actual - previousActual;
    const targetRate = realizationRate(actual, current?.targetRevenue);

    return { branch, current, previous, actual, previousActual, change, changeRate: percentChange(actual, previousActual), targetRate };
  }).filter((row) => {
    if (filter === "missing") return !row.current;
    if (filter === "target-met") return row.targetRate != null && row.targetRate >= 100;
    if (filter === "target-missed") return row.current?.targetRevenue && (row.targetRate ?? 0) < 100;
    if (filter === "increased") return row.change > 0;
    if (filter === "decreased") return row.change < 0;
    return true;
  });

  const finalCurrent = currentRecords.filter((record) => finalStatuses.includes(record.status as typeof finalStatuses[number]));
  const totalsByCurrency = groupTotal(finalCurrent);
  const avgByCurrency = Object.fromEntries(Object.entries(totalsByCurrency).map(([currency, total]) => [currency, total / Math.max(1, branches.length)]));
  const best = [...rows].sort((a, b) => b.actual - a.actual)[0];
  const worst = [...rows].filter((row) => row.current).sort((a, b) => a.actual - b.actual)[0];
  const previousTotalByCurrency = groupTotal(previousRecords.filter((record) => finalStatuses.includes(record.status as typeof finalStatuses[number])));
  const targetMet = rows.filter((row) => row.targetRate != null && row.targetRate >= 100).length;
  const targetMissed = rows.filter((row) => row.current?.targetRevenue && (row.targetRate ?? 0) < 100).length;
  const missing = rows.filter((row) => !row.current).length;
  const monthlyTotals = Array.from({ length: 12 }, (_, index) => {
    const monthNo = index + 1;
    const records = yearRecords.filter((record) => record.month === monthNo);

    return { label: String(monthNo).padStart(2, "0"), total: records.reduce((sum, record) => sum + record.grossRevenue, 0) };
  });
  const maxBar = Math.max(1, ...rows.map((row) => row.actual));
  const maxLine = Math.max(1, ...monthlyTotals.map((item) => item.total));

  return (
    <AppShell activeHref="/branch-revenues" eyebrow="Şube performansı" title="Şube Ciroları">
      <div className="space-y-5">
        <Card className="p-4 shadow-none">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-8">
            <label className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 size-4" />
              <input name="q" defaultValue={q} placeholder="Şube, kod veya şehir ara" className="h-10 w-full rounded-lg border pl-9 pr-3" />
            </label>
            <input name="year" type="number" defaultValue={year} className="h-10 rounded-lg border px-3" />
            <select name="month" defaultValue={month} className="h-10 rounded-lg border px-3">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>{item}. Ay</option>)}
            </select>
            <Select name="city" current={city} first="Tüm şehirler" options={cities.map((item) => [item.city, item.city])} />
            <Select name="ownershipType" current={ownershipType} first="Tüm tipler" options={Object.entries(BRANCH_OWNERSHIP_TYPES)} />
            <Select name="concept" current={concept} first="Tüm konseptler" options={Object.entries(BRANCH_CONCEPTS)} />
            <Select name="status" current={status} first="Tüm durumlar" options={Object.entries(BRANCH_STATUSES)} />
            <Select name="filter" current={filter} first="Performans filtresi" options={[["missing", "Veri girişi eksik"], ["target-met", "Hedefe ulaşan"], ["target-missed", "Hedef altında"], ["increased", "Ciro artan"], ["decreased", "Ciro düşen"]]} />
            <div className="flex gap-2 md:col-span-3 xl:col-span-8">
              <Button>Filtrele</Button>
              <Button asChild type="button" variant="outline"><Link href="/branch-revenues">Temizle</Link></Button>
              <Button type="button" variant="outline"><Download /> Excel Altyapısı</Button>
            </div>
          </form>
        </Card>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Toplam Ciro" value={moneyList(totalsByCurrency)} />
          <Metric title="Ortalama Şube Cirosu" value={moneyList(avgByCurrency)} />
          <Metric title="En Yüksek Ciro" value={best?.current ? `${best.branch.branchName} · ${formatMoney(best.actual, best.current.currency)}` : "—"} />
          <Metric title="En Düşük Ciro" value={worst?.current ? `${worst.branch.branchName} · ${formatMoney(worst.actual, worst.current.currency)}` : "—"} />
          <Metric title="Önceki Döneme Göre Büyüme" value={growthList(totalsByCurrency, previousTotalByCurrency)} />
          <Metric title="Hedefe Ulaşan" value={targetMet} />
          <Metric title="Hedef Altında" value={targetMissed} />
          <Metric title="Ciro Verisi Eksik" value={missing} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader><CardTitle className="flex items-center gap-2"><LineChart className="size-5" /> Şube Bazlı Ciro Karşılaştırması</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {rows.slice(0, 12).map((row) => (
                <div key={row.branch.id} className="grid gap-1">
                  <div className="flex justify-between text-sm"><span>{row.branch.branchName}</span><strong>{row.current ? formatMoney(row.actual, row.current.currency) : "Veri yok"}</strong></div>
                  <div className="h-3 rounded bg-[#edf0e9]"><div className="h-3 rounded bg-[#6fbe44]" style={{ width: `${Math.max(3, (row.actual / maxBar) * 100)}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader><CardTitle>Aylık Toplam Ciro Eğrisi</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-52 items-end gap-2 border-b border-l border-[#dfe4dc] p-3">
                {monthlyTotals.map((item) => (
                  <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-t bg-[#17201b]" style={{ height: `${Math.max(4, (item.total / maxLine) * 180)}px` }} />
                    <span className="text-xs text-[#65705f]">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="shadow-none">
          <CardHeader><CardTitle>Manuel Ciro Girişi</CardTitle></CardHeader>
          <CardContent>
            <form action={createBranchRevenue} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <Select name="branchId" current="" first="Şube seç" options={branches.map((branch) => [branch.id, `${branch.branchName} · ${branch.branchCode ?? "Kod yok"}`])} />
              <input name="year" type="number" defaultValue={year} className="h-10 rounded-lg border px-3" />
              <input name="month" type="number" min={1} max={12} defaultValue={month} className="h-10 rounded-lg border px-3" />
              <input name="grossRevenue" required type="number" min={0} step="0.01" placeholder="Gerçekleşen ciro" className="h-10 rounded-lg border px-3" />
              <input name="targetRevenue" type="number" min={0} step="0.01" placeholder="Ciro hedefi" className="h-10 rounded-lg border px-3" />
              <Select name="currency" current="TRY" first="" options={REVENUE_CURRENCIES.map((item) => [item, item])} />
              <input name="transactionCount" type="number" min={0} placeholder="İşlem sayısı" className="h-10 rounded-lg border px-3" />
              <input name="averageTicket" type="number" min={0} step="0.01" placeholder="Ortalama sepet" className="h-10 rounded-lg border px-3" />
              <Select name="source" current="MANUAL" first="" options={REVENUE_SOURCES.map((item) => [item, REVENUE_SOURCE_LABELS[item]])} />
              <input name="supportFile" type="file" className="h-10 rounded-lg border px-3 py-2 text-sm md:col-span-2" />
              <input name="notes" placeholder="Açıklama" className="h-10 rounded-lg border px-3 xl:col-span-2" />
              <div className="flex gap-2 md:col-span-2 xl:col-span-6">
                <Button name="submit" value="">Taslak Kaydet</Button>
                <Button name="submit" value="1" className="bg-[#17201b] text-white">Onaya Gönder</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <RevenueTable rows={rows} />
      </div>
    </AppShell>
  );
}

function RevenueTable({ rows }: { rows: RevenueRowData[] }) {
  return (
    <Card className="overflow-hidden shadow-none">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
            <tr>{["Şube", "Kod", "Şehir", "Tip", "Konsept", "Ciro", "Önceki", "Değişim", "Oran", "Hedef", "Hedef Oranı", "Günlük Ort.", "Kaynak", "Son Giriş", "Durum", "İşlem"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => <RevenueRow key={row.branch.id} row={row} />)}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 lg:hidden">
        {rows.map((row) => (
          <div key={row.branch.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
            <div className="flex justify-between gap-3"><b>{row.branch.branchName}</b><Badge>{row.current ? REVENUE_STATUS_LABELS[row.current.status as keyof typeof REVENUE_STATUS_LABELS] : "Veri yok"}</Badge></div>
            <p className="mt-2 text-sm text-[#65705f]">{row.branch.branchCode ?? "Kod yok"} · {row.branch.city}</p>
            <p className="mt-3 text-xl font-semibold">{row.current ? formatMoney(row.actual, row.current.currency) : "—"}</p>
            <p className="text-sm text-[#65705f]">Değişim {formatPercent(row.changeRate)} · Hedef {formatPercent(row.targetRate)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RevenueRow({ row }: { row: RevenueRowData }) {
  const current = row.current;
  const days = current ? Math.max(1, Math.ceil((current.periodEnd.getTime() - current.periodStart.getTime()) / 86400000) + 1) : 1;
  const trendIcon = row.change >= 0 ? <ArrowUpRight className="size-4 text-emerald-700" /> : <ArrowDownRight className="size-4 text-rose-700" />;

  return (
    <tr>
      <td className="px-4 py-4 font-semibold"><Link href={`/branches/${row.branch.id}?tab=${encodeURIComponent("KPI ve Performans")}`} className="underline">{row.branch.branchName}</Link></td>
      <td className="px-4 py-4">{row.branch.branchCode ?? "—"}</td>
      <td className="px-4 py-4">{row.branch.city}</td>
      <td className="px-4 py-4">{label(BRANCH_OWNERSHIP_TYPES, row.branch.ownershipType)}</td>
      <td className="px-4 py-4">{label(BRANCH_CONCEPTS, row.branch.concept)}</td>
      <td className="px-4 py-4">{current ? formatMoney(row.actual, current.currency) : "—"}</td>
      <td className="px-4 py-4">{row.previous ? formatMoney(row.previousActual, row.previous.currency) : "—"}</td>
      <td className="px-4 py-4">{current ? formatMoney(row.change, current.currency) : "—"}</td>
      <td className="px-4 py-4"><span className="inline-flex items-center gap-1">{trendIcon}{formatPercent(row.changeRate)}</span></td>
      <td className="px-4 py-4">{current ? formatMoney(current.targetRevenue, current.currency) : "—"}</td>
      <td className="px-4 py-4">{formatPercent(row.targetRate)}</td>
      <td className="px-4 py-4">{current ? formatMoney(row.actual / days, current.currency) : "—"}</td>
      <td className="px-4 py-4">{current ? REVENUE_SOURCE_LABELS[current.source as keyof typeof REVENUE_SOURCE_LABELS] ?? current.source : "—"}</td>
      <td className="px-4 py-4">{current ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(current.updatedAt) : "—"}</td>
      <td className="px-4 py-4"><Badge variant="outline">{current ? REVENUE_STATUS_LABELS[current.status as keyof typeof REVENUE_STATUS_LABELS] : "Veri girilmedi"}</Badge></td>
      <td className="px-4 py-4">
        {current ? (
          <div className="flex flex-wrap gap-1">
            {current.status === "SUBMITTED" ? <form action={approveRevenue.bind(null, current.id)}><Button size="sm" variant="outline">Onayla</Button></form> : null}
            {current.status === "SUBMITTED" ? <form action={rejectRevenue.bind(null, current.id)} className="flex gap-1"><input name="rejectionReason" placeholder="Ret nedeni" className="h-7 w-28 rounded border px-2 text-xs" /><Button size="sm" variant="outline">Reddet</Button></form> : null}
            {current.status === "APPROVED" ? <form action={lockRevenue.bind(null, current.id)}><Button size="sm" variant="outline">Kilitle</Button></form> : null}
          </div>
        ) : "—"}
      </td>
    </tr>
  );
}

function Metric({ title, value }: { title: string; value: ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <p className="text-sm text-[#65705f]">{title}</p>
        <div className="mt-2 text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Select({ name, current, first, options }: { name: string; current: string | number; first: string; options: string[][] }) {
  return (
    <select name={name} defaultValue={current} aria-label={name} className="h-10 rounded-lg border px-3">
      {first ? <option value="">{first}</option> : null}
      {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
    </select>
  );
}

function groupTotal(records: RevenueRecordForPage[]) {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.currency] = (acc[record.currency] ?? 0) + record.grossRevenue;
    return acc;
  }, {});
}

function moneyList(values: Record<string, number>) {
  const entries = Object.entries(values);
  if (!entries.length) return "—";

  return <div className="space-y-1">{entries.map(([currency, value]) => <p key={currency}>{formatMoney(value, currency)}</p>)}</div>;
}

function growthList(current: Record<string, number>, previous: Record<string, number>) {
  const currencies = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)]));
  if (!currencies.length) return "—";

  return <div className="space-y-1">{currencies.map((currency) => <p key={currency}>{currency}: {formatPercent(percentChange(current[currency] ?? 0, previous[currency] ?? 0))}</p>)}</div>;
}
