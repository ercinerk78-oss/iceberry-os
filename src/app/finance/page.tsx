import Link from "next/link";
import { AlertTriangle, Banknote, CheckCircle2, Clock3, FileWarning, Landmark, LineChart, ReceiptText } from "lucide-react";
import { Prisma } from "@prisma/client";

import { approveRoyalty, reverseLedgerEntry } from "@/app/finance/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceForms } from "@/components/finance/finance-forms";
import { financeBranchWhere, requireFinanceUser, canManageFinance } from "@/lib/finance/access";
import { ROYALTY_STATUS_LABELS } from "@/lib/finance/constants";
import { money } from "@/lib/finance/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
type Metric = { title: string; value: string | number; icon: typeof Landmark; href?: string; tone?: string };

const get = (params: Params, key: string) => (typeof params[key] === "string" ? params[key] : "");
const openDebtStatuses = ["POSTED", "APPROVED"];

export default async function FinancePage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireFinanceUser();
  const params = await searchParams;
  const now = new Date();
  const year = Number(get(params, "year") || now.getFullYear());
  const month = Number(get(params, "month") || now.getMonth() + 1);
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  const branchWhere = await financeBranchWhere();
  const scopedBranchWhere = { archivedAt: null, ...branchWhere };

  const [
    branches,
    ledgerAccounts,
    overdueEntries,
    monthRoyalty,
    monthRoyaltyPaid,
    monthCollections,
    pendingReconciliations,
    missingRevenueBranches,
    openAccruals,
    recentPayments,
    disputes,
    openDisputes,
    recentLedgerEntries,
    reconciliations,
  ] = await Promise.all([
    prisma.branch.findMany({
      where: scopedBranchWhere,
      select: { id: true, branchName: true, ownershipType: true },
      orderBy: { branchName: "asc" },
      take: 300,
    }),
    prisma.branchLedgerAccount.findMany({ where: { branch: scopedBranchWhere }, include: { branch: { select: { branchName: true, city: true } } }, orderBy: { currentBalance: "desc" } }),
    prisma.branchLedgerEntry.findMany({
      where: { branch: scopedBranchWhere, direction: "DEBIT", dueDate: { lt: now }, status: { in: openDebtStatuses } },
      include: { branch: { select: { branchName: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.royaltyAccrual.findMany({ where: { branch: scopedBranchWhere, periodStart: { gte: startOfMonth, lte: endOfMonth } } }),
    prisma.royaltyAccrual.findMany({ where: { branch: scopedBranchWhere, updatedAt: { gte: startOfMonth, lte: endOfMonth }, paidAmount: { gt: new Prisma.Decimal(0) } } }),
    prisma.collectionPayment.findMany({ where: { branch: scopedBranchWhere, paymentDate: { gte: startOfMonth, lte: endOfMonth }, status: { not: "CANCELLED" } } }),
    prisma.branchFinancialReconciliation.count({ where: { branch: scopedBranchWhere, status: { in: ["PENDING", "DISPUTED", "DIFFERENCE_FOUND"] } } }),
    prisma.branch.count({
      where: {
        ...scopedBranchWhere,
        ownershipType: "FRANCHISE",
        revenueRecords: { none: { periodType: "MONTHLY", periodStart: startOfMonth, status: { in: ["APPROVED", "LOCKED"] } } },
      },
    }),
    prisma.royaltyAccrual.findMany({
      where: { branch: scopedBranchWhere, status: { in: ["CALCULATED", "REVIEW_REQUIRED", "APPROVED", "INVOICING_PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { branch: { select: { branchName: true, city: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.collectionPayment.findMany({
      where: { branch: scopedBranchWhere },
      include: { branch: { select: { branchName: true } } },
      orderBy: { paymentDate: "desc" },
      take: 12,
    }),
    prisma.financialDispute.count({ where: { branch: scopedBranchWhere, status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_DOCUMENT"] } } }),
    prisma.financialDispute.findMany({
      where: { branch: scopedBranchWhere, status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_DOCUMENT"] } },
      include: { branch: { select: { branchName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.branchLedgerEntry.findMany({
      where: { branch: scopedBranchWhere },
      include: { branch: { select: { branchName: true } } },
      orderBy: { transactionDate: "desc" },
      take: 20,
    }),
    prisma.branchFinancialReconciliation.findMany({
      where: { branch: scopedBranchWhere },
      include: { branch: { select: { branchName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const totalReceivable = sumDecimals(ledgerAccounts.map((account) => account.currentBalance.gt(0) ? account.currentBalance : new Prisma.Decimal(0)));
  const overdueAmount = sumDecimals(overdueEntries.map((entry) => entry.amount));
  const royaltyAccrued = sumDecimals(monthRoyalty.map((item) => item.totalAmount));
  const royaltyCollected = sumDecimals(monthRoyaltyPaid.map((item) => item.paidAmount));
  const collected = sumDecimals(monthCollections.map((item) => item.amount));
  const dueThisMonth = sumDecimals(openAccruals.filter((item) => item.dueDate >= startOfMonth && item.dueDate <= endOfMonth).map((item) => item.totalAmount));
  const collectionRate = dueThisMonth.gt(0) ? collected.div(dueThisMonth).mul(100).toDecimalPlaces(1).toNumber() : 0;
  const overdueBranchCount = new Set(overdueEntries.map((entry) => entry.branchId)).size;
  const criticalRiskCount = ledgerAccounts.filter((account) => account.riskLimit && account.currentBalance.gt(account.riskLimit)).length;
  const uninvoicedRoyalty = openAccruals.filter((item) => ["APPROVED", "INVOICING_PENDING"].includes(item.status) && !item.parasutInvoiceId).length;

  const metrics: Metric[] = [
    { title: "Toplam Şube Alacağı", value: money(totalReceivable), icon: Landmark },
    { title: "Toplam Vadesi Geçmiş Alacak", value: money(overdueAmount), icon: AlertTriangle, tone: "text-rose-700" },
    { title: "Bu Ay Tahakkuk Eden Royalty", value: money(royaltyAccrued), icon: ReceiptText },
    { title: "Bu Ay Tahsil Edilen Royalty", value: money(royaltyCollected), icon: CheckCircle2 },
    { title: "Bu Ay Toplam Tahsilat", value: money(collected), icon: Banknote },
    { title: "Tahsilat Oranı", value: `%${collectionRate}`, icon: LineChart },
    { title: "Vadesi Geçen Şube Sayısı", value: overdueBranchCount, icon: Clock3, tone: "text-orange-700" },
    { title: "Kritik Riskli Şube Sayısı", value: criticalRiskCount, icon: FileWarning, tone: "text-rose-700" },
    { title: "Mutabakat Bekleyen Şube Sayısı", value: pendingReconciliations, icon: ReceiptText },
    { title: "Faturası Oluşmayan Royalty", value: uninvoicedRoyalty, icon: ReceiptText },
    { title: "Paraşüt Farkı Bulunan Şube Sayısı", value: 0, icon: AlertTriangle },
    { title: "Cirosu Eksik Şube Sayısı", value: missingRevenueBranches, icon: FileWarning },
  ];

  return (
    <AppShell activeHref="/finance" eyebrow="Royalty, cari hesap ve tahsilat" title="Finans Yönetimi">
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.title} className="shadow-none">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm text-[#65705f]">{metric.title}</p>
                  <p className={`mt-2 text-2xl font-semibold ${metric.tone ?? ""}`}>{metric.value}</p>
                </div>
                <metric.icon className="size-5 text-[#6fbe44]" />
              </CardContent>
            </Card>
          ))}
        </section>

        {canManageFinance(user.role) ? <FinanceForms branches={branches} year={year} month={month} /> : null}

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Açık Royalty Tahakkukları</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                  <tr>{["Şube", "Dönem", "Tutar", "Ödenen", "Kalan", "Durum", "İşlem"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {openAccruals.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-medium">{item.branch.branchName}</td>
                      <td className="px-3 py-3">{date(item.periodStart)} - {date(item.periodEnd)}</td>
                      <td className="px-3 py-3">{money(item.totalAmount, item.currency)}</td>
                      <td className="px-3 py-3">{money(item.paidAmount, item.currency)}</td>
                      <td className="px-3 py-3">{money(item.outstandingAmount, item.currency)}</td>
                      <td className="px-3 py-3"><Badge variant="outline">{ROYALTY_STATUS_LABELS[item.status as keyof typeof ROYALTY_STATUS_LABELS] ?? item.status}</Badge></td>
                      <td className="px-3 py-3">
                        {canManageFinance(user.role) && ["CALCULATED", "REVIEW_REQUIRED"].includes(item.status) ? (
                          <form action={approveRoyalty.bind(null, item.id)}>
                            <Button size="sm" variant="outline">Onayla ve Cariye Yansıt</Button>
                          </form>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                  {!openAccruals.length ? <tr><td colSpan={7} className="p-8 text-center text-[#65705f]">Açık royalty tahakkuku yok.</td></tr> : null}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Şube Cari Hesapları</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ledgerAccounts.slice(0, 12).map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <div>
                    <p className="font-medium">{account.branch.branchName}</p>
                    <p className="text-xs text-[#65705f]">{account.currency} cari hesabı · {account.currentBalance.gte(0) ? "Şubenin merkeze borcu" : "Şube avans/alacak bakiyesi"}</p>
                  </div>
                  <strong>{money(account.currentBalance, account.currency)}</strong>
                </div>
              ))}
              {!ledgerAccounts.length ? <p className="py-8 text-center text-sm text-[#65705f]">Henüz cari hesap oluşmamış.</p> : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Cari Hareketler</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                  <tr>{["No", "Şube", "Tür", "Yön", "Tutar", "Vade", "Durum", "İşlem"].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {recentLedgerEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-3 py-3 font-mono text-xs">{entry.entryNumber}</td>
                      <td className="px-3 py-3">{entry.branch.branchName}</td>
                      <td className="px-3 py-3">{entry.entryType}</td>
                      <td className="px-3 py-3"><Badge variant="outline">{entry.direction === "DEBIT" ? "Borç" : "Alacak"}</Badge></td>
                      <td className="px-3 py-3">{money(entry.amount, entry.currency)}</td>
                      <td className="px-3 py-3">{entry.dueDate ? date(entry.dueDate) : "—"}</td>
                      <td className="px-3 py-3">{entry.status}</td>
                      <td className="px-3 py-3">
                        {canManageFinance(user.role) && entry.status !== "REVERSED" ? (
                          <form action={reverseLedgerEntry.bind(null, entry.id)}>
                            <Button size="sm" variant="outline">Ters Kayıt</Button>
                          </form>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                  {!recentLedgerEntries.length ? <tr><td colSpan={8} className="p-8 text-center text-[#65705f]">Cari hareket yok.</td></tr> : null}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Cari Mutabakat</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {reconciliations.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.branch.branchName}</p>
                      <p className="text-xs text-[#65705f]">{date(item.periodStart)} - {date(item.periodEnd)} · {item.provider ?? "ICEBERRY"}</p>
                    </div>
                    <Badge className={item.status === "MATCHED" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}>{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[#65705f]">Iceberry: {money(item.internalBalance, item.currency)} · Dış bakiye: {item.externalBalance ? money(item.externalBalance, item.currency) : "—"} · Fark: {item.differenceAmount ? money(item.differenceAmount, item.currency) : "—"}</p>
                </div>
              ))}
              {!reconciliations.length ? <p className="py-8 text-center text-sm text-[#65705f]">Henüz mutabakat kaydı yok.</p> : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Son Tahsilatlar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-lg border border-[#edf0e9] p-3">
                  <div>
                    <p className="font-medium">{payment.branch.branchName}</p>
                    <p className="text-xs text-[#65705f]">{date(payment.paymentDate)} · {payment.status} · Dağıtılmamış: {money(payment.unappliedAmount, payment.currency)}</p>
                  </div>
                  <strong>{money(payment.amount, payment.currency)}</strong>
                </div>
              ))}
              {!recentPayments.length ? <p className="py-8 text-center text-sm text-[#65705f]">Henüz tahsilat kaydı yok.</p> : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Finansal İtirazlar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {openDisputes.map((dispute) => (
                <div key={dispute.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{dispute.branch.branchName}</p>
                      <p className="text-xs text-[#65705f]">{dispute.disputeType} · {date(dispute.createdAt)}</p>
                    </div>
                    <Badge variant="outline">{dispute.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[#364036]">{dispute.description}</p>
                </div>
              ))}
              {!openDisputes.length ? <p className="py-8 text-center text-sm text-[#65705f]">Açık finansal itiraz yok.</p> : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Finansal Kontrol Listesi</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <StatusLine label="Açık finansal itiraz" value={disputes} />
              <StatusLine label="Vadesi geçen cari hareket" value={overdueEntries.length} />
              <StatusLine label="Cirosu eksik franchise şube" value={missingRevenueBranches} />
              <StatusLine label="Paraşüt mutabakat farkı" value={0} />
              <Link href="/branch-revenues" className="text-[#3f7f22] underline">Ciro kayıtlarını kontrol et</Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function sumDecimals(values: Prisma.Decimal[]) {
  return values.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0));
}

function date(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(value);
}

function StatusLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#edf0e9] bg-[#f8faf6] px-3 py-2">
      <span>{label}</span>
      <Badge className={value ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"}>{value}</Badge>
    </div>
  );
}
