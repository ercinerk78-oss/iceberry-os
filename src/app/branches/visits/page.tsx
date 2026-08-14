import Link from "next/link";
import { CalendarCheck, CalendarClock, ClipboardCheck, Store, XCircle } from "lucide-react";

import { cancelBranchVisit, completeBranchVisit, createBranchVisit } from "@/app/branches/visits/actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { branchScopeWhere } from "@/lib/branch-access";
import { BRANCH_STATUSES, formatDate, label } from "@/lib/franchise";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VISIT_TYPE_LABELS: Record<string, string> = {
  OPERATION: "Operasyon Ziyareti",
  QUALITY: "Kalite Kontrol",
  TRAINING: "Eğitim Ziyareti",
  SUPPORT: "Destek Ziyareti",
  OPENING_FOLLOW_UP: "Açılış Sonrası Takip",
};

const VISIT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlandı",
  COMPLETED: "Gerçekleşti",
  CANCELLED: "İptal Edildi",
};

type VisitWithBranch = {
  id: string;
  title: string;
  visitType: string;
  plannedAt: Date;
  completedAt: Date | null;
  status: string;
  visitorName: string | null;
  notes: string | null;
  resultNotes: string | null;
  branch: {
    id: string;
    branchName: string;
    city: string;
    district: string | null;
    operationsManager: string | null;
  };
};

export default async function BranchVisitsPage() {
  const scope = await branchScopeWhere();
  const branchWhere = { archivedAt: null, ...scope };
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [branches, visits, monthlyCompleted] = await Promise.all([
    prisma.branch.findMany({
      where: branchWhere,
      select: {
        id: true,
        branchName: true,
        city: true,
        district: true,
        status: true,
        operationsManager: true,
        visits: {
          orderBy: [{ plannedAt: "desc" }],
          take: 1,
        },
      },
      orderBy: [{ city: "asc" }, { branchName: "asc" }],
      take: 500,
    }),
    prisma.branchVisit.findMany({
      where: { branch: branchWhere },
      include: { branch: { select: { id: true, branchName: true, city: true, district: true, operationsManager: true } } },
      orderBy: [{ status: "asc" }, { plannedAt: "asc" }],
      take: 500,
    }),
    prisma.branchVisit.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: sixMonthsAgo },
        branch: branchWhere,
      },
      select: { completedAt: true },
    }),
  ]);

  const plannedVisits = visits.filter((visit) => visit.status === "PLANNED");
  const completedVisits = visits.filter((visit) => visit.status === "COMPLETED");
  const cancelledVisits = visits.filter((visit) => visit.status === "CANCELLED");
  const thisMonthCompleted = completedVisits.filter((visit) => visit.completedAt && visit.completedAt >= monthStart && visit.completedAt < monthEnd).length;
  const monthBuckets = new Map<string, number>();
  for (const visit of monthlyCompleted) {
    if (!visit.completedAt) continue;
    const key = `${visit.completedAt.getFullYear()}-${String(visit.completedAt.getMonth() + 1).padStart(2, "0")}`;
    monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
  }
  const monthlyAverage = monthBuckets.size ? monthlyCompleted.length / monthBuckets.size : 0;

  return (
    <AppShell activeHref="/branches" eyebrow="Merkez operasyon ziyaretleri" title="Şube Ziyaretleri">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Toplam Şube" value={branches.length} icon={Store} />
          <Metric label="Planlanan Ziyaret" value={plannedVisits.length} icon={CalendarClock} />
          <Metric label="Bu Ay Gerçekleşen" value={thisMonthCompleted} icon={CalendarCheck} />
          <Metric label="Aylık Ortalama" value={monthlyAverage ? monthlyAverage.toFixed(1) : "0"} icon={ClipboardCheck} />
          <Metric label="İptal Edilen" value={cancelledVisits.length} icon={XCircle} />
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Manuel Ziyaret Planla</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createBranchVisit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <Select name="branchId" first="Şube seç" options={branches.map((branch) => [branch.id, `${branch.branchName} · ${branch.city}`])} required />
              <input name="plannedAt" type="datetime-local" required className="h-10 rounded-lg border px-3 text-sm" />
              <Select name="visitType" first="Ziyaret tipi" options={Object.entries(VISIT_TYPE_LABELS)} />
              <input name="visitorName" placeholder="Ziyaret sorumlusu" className="h-10 rounded-lg border px-3 text-sm" />
              <input name="title" placeholder="Başlık" className="h-10 rounded-lg border px-3 text-sm xl:col-span-2" />
              <textarea name="notes" placeholder="Plan notu" className="min-h-20 rounded-lg border p-3 text-sm md:col-span-2 xl:col-span-5" />
              <Button className="h-10 bg-[#17201b] text-white">Ziyaret Planla</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Bütün Şubeler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
                  <tr>{["Şube", "Şehir", "Durum", "Operasyon Sorumlusu", "Son Ziyaret", "Sonuç"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {branches.map((branch) => {
                    const lastVisit = branch.visits[0];
                    return (
                      <tr key={branch.id}>
                        <td className="px-4 py-4 font-semibold"><Link href={`/branches/${branch.id}`} className="hover:underline">{branch.branchName}</Link></td>
                        <td className="px-4 py-4">{branch.city}{branch.district ? ` / ${branch.district}` : ""}</td>
                        <td className="px-4 py-4"><Badge variant="outline">{label(BRANCH_STATUSES, branch.status)}</Badge></td>
                        <td className="px-4 py-4">{branch.operationsManager ?? "-"}</td>
                        <td className="px-4 py-4">{lastVisit ? formatDate(lastVisit.completedAt ?? lastVisit.plannedAt) : "-"}</td>
                        <td className="px-4 py-4">{lastVisit ? visitStatusLabel(lastVisit.status) : "Ziyaret yok"}</td>
                      </tr>
                    );
                  })}
                  {!branches.length ? <tr><td colSpan={6} className="p-10 text-center text-[#65705f]">Şube bulunamadı.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <VisitList title="Planlanan Ziyaretler" visits={plannedVisits} showCompleteAction showCancelAction />
          <VisitList title="Geçmiş / Gerçekleşen Ziyaretler" visits={completedVisits} />
          <VisitList title="İptal Edilen Ziyaretler" visits={cancelledVisits} />
        </div>
      </div>
    </AppShell>
  );
}

function VisitList({
  title,
  visits,
  showCompleteAction = false,
  showCancelAction = false,
}: {
  title: string;
  visits: VisitWithBranch[];
  showCompleteAction?: boolean;
  showCancelAction?: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>{title}</span>
          <Badge variant="secondary">{visits.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visits.map((visit) => (
            <article key={visit.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{visitStatusLabel(visit.status)}</Badge>
                    <Badge variant="secondary">{VISIT_TYPE_LABELS[visit.visitType] ?? visit.visitType}</Badge>
                  </div>
                  <h3 className="mt-3 font-semibold">{visit.title}</h3>
                  <p className="mt-1 text-sm text-[#65705f]">
                    {visit.branch.branchName} · {visit.branch.city}
                    {visit.branch.district ? ` / ${visit.branch.district}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-[#65705f]">
                    Plan: {formatDate(visit.plannedAt)}{visit.completedAt ? ` · Gerçekleşme: ${formatDate(visit.completedAt)}` : ""}
                  </p>
                  {visit.visitorName ? <p className="mt-1 text-sm text-[#65705f]">Sorumlu: {visit.visitorName}</p> : null}
                  {visit.notes ? <p className="mt-2 text-sm">{visit.notes}</p> : null}
                  {visit.resultNotes ? <p className="mt-2 rounded-lg bg-white p-3 text-sm">{visit.resultNotes}</p> : null}
                </div>
                {showCompleteAction || showCancelAction ? (
                  <div className="grid shrink-0 gap-3">
                    {showCompleteAction ? (
                      <form action={completeBranchVisit.bind(null, visit.id)} className="grid gap-2">
                        <input name="completedAt" type="datetime-local" className="h-10 rounded-lg border bg-white px-3 text-sm" />
                        <input name="resultNotes" placeholder="Gerçekleşme notu" className="h-10 rounded-lg border bg-white px-3 text-sm" />
                        <Button size="sm" className="bg-[#17201b] text-white">Gerçekleşti</Button>
                      </form>
                    ) : null}
                    {showCancelAction ? (
                      <form action={cancelBranchVisit.bind(null, visit.id)} className="grid gap-2 rounded-lg border border-rose-200 bg-white p-2">
                        <input name="cancellationReason" required placeholder="İptal nedeni" className="h-10 rounded-lg border bg-white px-3 text-sm" />
                        <Button size="sm" variant="destructive">İptal Et</Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {!visits.length ? (
            <p className="rounded-lg border border-dashed border-[#dfe4dc] p-10 text-center text-sm text-[#65705f]">Bu bölümde ziyaret kaydı yok.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Store }) {
  return (
    <Card className="p-4 shadow-none">
      <Icon className="size-5 text-[#65705f]" />
      <p className="mt-3 text-sm text-[#65705f]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function Select({
  name,
  first,
  options,
  required,
}: {
  name: string;
  first: string;
  options: string[][];
  required?: boolean;
}) {
  return (
    <select name={name} required={required} aria-label={first} className="h-10 rounded-lg border px-3 text-sm">
      <option value="">{first}</option>
      {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
    </select>
  );
}

function visitStatusLabel(status: string) {
  return VISIT_STATUS_LABELS[status] ?? status;
}
