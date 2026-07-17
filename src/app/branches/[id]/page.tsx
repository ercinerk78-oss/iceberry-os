import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckSquare, FileText, ShieldCheck, TrendingUp } from "lucide-react";

import { updateBranch } from "@/app/branches/actions";
import { AppShell } from "@/components/app-shell";
import { BranchForm } from "@/components/branches/branch-form";
import { RelatedDocumentsPanel } from "@/components/documents/related-documents-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BRANCH_CONCEPTS, BRANCH_OWNERSHIP_TYPES, BRANCH_STATUSES, formatDate, label } from "@/lib/franchise";
import { formatMoney, formatPercent, percentChange, periodLabel, realizationRate } from "@/lib/branch-revenue";
import { safeFindBranchRevenueRecords } from "@/lib/branch-revenue-data";
import { canAccessBranch } from "@/lib/branch-access";
import { OPENING_STATUSES, openingLabel } from "@/lib/openings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tabs = [
  "Genel",
  "Açılış Süreci",
  "Kullanıcılar",
  "Görevler",
  "Dokümanlar",
  "Denetim Raporları",
  "Şube Gelişim Planları",
  "Operasyon Takvimi",
  "KPI ve Performans",
  "Timeline",
  "Notlar",
] as const;

export default async function BranchDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "Genel" } = await searchParams;
  if (!(await canAccessBranch(id))) notFound();
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      candidate: { select: { id: true, fullName: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
      users: { include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } }, orderBy: { createdAt: "desc" } },
      tasks: { include: { evidence: true }, orderBy: { createdAt: "desc" } },
      audits: { orderBy: { auditDate: "desc" } },
      developmentPlans: { orderBy: { createdAt: "desc" } },
      operationCalendarItems: { orderBy: { startAt: "asc" } },
      timeline: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 },
      openings: {
        where: { archivedAt: null },
        include: { stages: { include: { tasks: true }, orderBy: { orderIndex: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!branch) notFound();
  const revenueRecords = await safeFindBranchRevenueRecords({
    where: { branchId: id },
    include: { enteredBy: { select: { name: true } } },
    orderBy: { periodStart: "desc" },
    take: 36,
  });

  const activeOpening = branch.openings.find((opening) => !["COMPLETED", "CANCELLED"].includes(opening.status));
  const activeStage = activeOpening?.stages.find((stage) => stage.status === "IN_PROGRESS");
  const openTasks = branch.tasks.filter((task) => ["OPEN", "IN_PROGRESS", "REJECTED", "SUBMITTED", "UNDER_REVIEW"].includes(task.status));
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < new Date());
  const lastAudit = branch.audits[0];
  const activeDevelopmentPlans = branch.developmentPlans.filter((plan) => !["COMPLETED", "CANCELLED"].includes(plan.status));
  const values = {
    ...branch,
    contractStartDate: branch.contractStartDate?.toISOString() ?? "",
    contractEndDate: branch.contractEndDate?.toISOString() ?? "",
    leaseStartDate: branch.leaseStartDate?.toISOString() ?? "",
    leaseEndDate: branch.leaseEndDate?.toISOString() ?? "",
    openingDate: branch.openingDate?.toISOString() ?? "",
    plannedOpeningDate: branch.plannedOpeningDate?.toISOString() ?? "",
    closingDate: branch.closingDate?.toISOString() ?? "",
  };

  return (
    <AppShell activeHref="/branches" eyebrow="Şube operasyon çekirdeği" title={branch.branchName}>
      <div className="space-y-4">
        <Card className="p-5 shadow-none">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{label(BRANCH_STATUSES, branch.status)}</Badge>
                <Badge variant="secondary">{label(BRANCH_OWNERSHIP_TYPES, branch.ownershipType)}</Badge>
                <Badge variant="secondary">{label(BRANCH_CONCEPTS, branch.concept)}</Badge>
              </div>
              <p className="mt-3 text-sm text-[#65705f]">
                {branch.branchCode ?? "Kod yok"} · {branch.city}
                {branch.district ? ` / ${branch.district}` : ""} · Planlanan açılış {formatDate(branch.plannedOpeningDate)}
              </p>
              {branch.candidate ? (
                <Link href={`/candidates/${branch.candidate.id}`} className="mt-2 inline-block text-sm font-medium underline">
                  Bağlı franchise adayı: {branch.candidate.fullName}
                </Link>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Metric label="Açık Görev" value={openTasks.length} icon={CheckSquare} />
              <Metric label="Geciken Görev" value={overdueTasks.length} icon={CalendarClock} />
              <Metric label="Son Denetim" value={lastAudit?.score ?? branch.lastAuditScore ?? "—"} icon={ShieldCheck} />
            </div>
          </div>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="border-b">
            <nav className="flex flex-wrap gap-2">
              {tabs.map((item) => (
                <Button key={item} asChild variant={tab === item ? "default" : "outline"}>
                  <Link href={`/branches/${id}?tab=${encodeURIComponent(item)}`}>{item}</Link>
                </Button>
              ))}
            </nav>
          </CardHeader>
          <CardContent className="p-5">
            {tab === "Genel" ? <BranchForm action={updateBranch.bind(null, id)} values={values} /> : null}
            {tab === "Açılış Süreci" ? <OpeningPanel activeOpening={activeOpening} activeStageTitle={activeStage?.title} /> : null}
            {tab === "Kullanıcılar" ? <UsersPanel users={branch.users} /> : null}
            {tab === "Görevler" ? <TasksPanel tasks={branch.tasks} /> : null}
            {tab === "Dokümanlar" ? <RelatedDocumentsPanel relation="branch" relationId={id} documents={branch.documents} /> : null}
            {tab === "Denetim Raporları" ? <AuditPanel audits={branch.audits} /> : null}
            {tab === "Şube Gelişim Planları" ? <DevelopmentPanel plans={branch.developmentPlans} /> : null}
            {tab === "Operasyon Takvimi" ? <CalendarPanel items={branch.operationCalendarItems} /> : null}
            {tab === "KPI ve Performans" ? (
              <RevenuePerformance records={revenueRecords} healthScore={branch.healthScore} activePlanCount={activeDevelopmentPlans.length} lastAuditScore={lastAudit?.score ?? branch.lastAuditScore} />
            ) : null}
            {tab === "Timeline" ? <TimelinePanel events={branch.timeline} /> : null}
            {tab === "Notlar" ? <Empty title="Notlar" text={branch.generalNotes ?? "Bu şube için not bulunmuyor."} /> : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof CheckSquare }) {
  return (
    <div className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
      <Icon className="size-4 text-[#65705f]" />
      <p className="mt-2 text-xs text-[#65705f]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function OpeningPanel({ activeOpening, activeStageTitle }: { activeOpening: { id: string; title: string; status: string; progressPercentage: number; plannedOpeningDate: Date } | undefined; activeStageTitle?: string }) {
  if (!activeOpening) return <Empty title="Açılış Süreci" text="Bu şubenin aktif açılış projesi yok." />;

  return (
    <div className="rounded-lg border p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="font-semibold">{activeOpening.title}</h3>
          <p className="text-sm text-[#65705f]">
            {openingLabel(OPENING_STATUSES, activeOpening.status)} · Mevcut aşama: {activeStageTitle ?? "—"}
          </p>
        </div>
        <Button asChild>
          <Link href={`/openings/${activeOpening.id}`}>Açılış Detayına Git</Link>
        </Button>
      </div>
      <div className="mt-4 h-2 rounded bg-[#edf0e9]">
        <div className="h-2 rounded bg-[#6fbe44]" style={{ width: `${activeOpening.progressPercentage}%` }} />
      </div>
      <p className="mt-2 text-sm">İlerleme %{activeOpening.progressPercentage} · Planlanan açılış {formatDate(activeOpening.plannedOpeningDate)}</p>
    </div>
  );
}

function UsersPanel({ users }: { users: { id: string; role: string; user: { name: string; email: string; role: string; isActive: boolean } }[] }) {
  if (!users.length) return <Empty title="Kullanıcılar" text="Bu şubeye atanmış kullanıcı yok." />;

  return <List items={users.map((item) => `${item.user.name} · ${item.role} · ${item.user.email}`)} />;
}

function TasksPanel({ tasks }: { tasks: { id: string; title: string; status: string; dueDate: Date | null; evidence: unknown[] }[] }) {
  if (!tasks.length) return <Empty title="Görevler" text="Bu şubeye atanmış görev yok." />;

  return <List items={tasks.map((task) => `${task.title} · ${task.status} · ${formatDate(task.dueDate)} · Kanıt: ${task.evidence.length}`)} />;
}

function AuditPanel({ audits }: { audits: { title: string; status: string; score: number | null; auditDate: Date; criticalCount: number }[] }) {
  if (!audits.length) return <Empty title="Denetim Raporları" text="Bu şube için denetim raporu yok." />;

  return <List items={audits.map((audit) => `${audit.title} · ${audit.status} · Puan: ${audit.score ?? "—"} · Kritik: ${audit.criticalCount} · ${formatDate(audit.auditDate)}`)} />;
}

function DevelopmentPanel({ plans }: { plans: { title: string; status: string; priority: string; dueDate: Date | null }[] }) {
  if (!plans.length) return <Empty title="Şube Gelişim Planları" text="Bu şube için gelişim planı yok." />;

  return <List items={plans.map((plan) => `${plan.title} · ${plan.status} · ${plan.priority} · ${formatDate(plan.dueDate)}`)} />;
}

function CalendarPanel({ items }: { items: { title: string; eventType: string; startAt: Date; status: string }[] }) {
  if (!items.length) return <Empty title="Operasyon Takvimi" text="Bu şube için operasyon takvimi kaydı yok." />;

  return <List items={items.map((item) => `${item.title} · ${item.eventType} · ${formatDate(item.startAt)} · ${item.status}`)} />;
}

function TimelinePanel({ events }: { events: { id: string; action: string; description: string; createdAt: Date; user: { name: string } | null }[] }) {
  if (!events.length) return <Empty title="Timeline" text="Bu şube için timeline kaydı yok." />;

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
          <p className="font-semibold">{event.action}</p>
          <p className="mt-1 text-sm text-[#65705f]">{event.description}</p>
          <p className="mt-2 text-xs text-[#8a9484]">{event.user?.name ?? "Sistem"} · {formatDate(event.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function RevenuePerformance({
  records,
  healthScore,
  activePlanCount,
  lastAuditScore,
}: {
  records: { id: string; year: number; month: number; grossRevenue: number; targetRevenue: number | null; currency: string; status: string; periodStart: Date; periodEnd: Date; updatedAt: Date; source: string; enteredBy: { name: string } | null }[];
  healthScore: number | null;
  activePlanCount: number;
  lastAuditScore: number | null | undefined;
}) {
  const finalRecords = records.filter((record) => ["APPROVED", "LOCKED"].includes(record.status)).sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  const current = finalRecords.at(-1);
  const previous = finalRecords.at(-2);
  const lastYearSameMonth = current ? finalRecords.find((record) => record.year === current.year - 1 && record.month === current.month) : undefined;
  const ytd = current ? finalRecords.filter((record) => record.year === current.year && record.currency === current.currency).reduce((sum, record) => sum + record.grossRevenue, 0) : 0;
  const maxDaily = current ? current.grossRevenue / Math.max(1, new Date(current.year, current.month, 0).getDate()) : 0;
  const max = Math.max(1, ...finalRecords.map((record) => record.grossRevenue), ...finalRecords.map((record) => record.targetRevenue ?? 0));
  const first = finalRecords[0];
  const last = finalRecords.at(-1);
  const highest = [...finalRecords].sort((a, b) => b.grossRevenue - a.grossRevenue)[0];
  const lowest = [...finalRecords].sort((a, b) => a.grossRevenue - b.grossRevenue)[0];
  const average = finalRecords.length ? finalRecords.reduce((sum, record) => sum + record.grossRevenue, 0) / finalRecords.length : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Güncel Ay Cirosu" value={current ? formatMoney(current.grossRevenue, current.currency) : "—"} icon={TrendingUp} />
        <Metric label="Önceki Ay Cirosu" value={previous ? formatMoney(previous.grossRevenue, previous.currency) : "—"} icon={TrendingUp} />
        <Metric label="Aylık Büyüme" value={current && previous ? formatPercent(percentChange(current.grossRevenue, previous.grossRevenue)) : "—"} icon={TrendingUp} />
        <Metric label="Geçen Yıl Aynı Ay" value={lastYearSameMonth ? formatMoney(lastYearSameMonth.grossRevenue, lastYearSameMonth.currency) : "—"} icon={TrendingUp} />
        <Metric label="Yıllık Büyüme" value={current && lastYearSameMonth ? formatPercent(percentChange(current.grossRevenue, lastYearSameMonth.grossRevenue)) : "—"} icon={TrendingUp} />
        <Metric label="Yılbaşından Bugüne" value={current ? formatMoney(ytd, current.currency) : "—"} icon={TrendingUp} />
        <Metric label="Aylık Hedef" value={current ? formatMoney(current.targetRevenue, current.currency) : "—"} icon={TrendingUp} />
        <Metric label="Hedef Oranı" value={current ? formatPercent(realizationRate(current.grossRevenue, current.targetRevenue)) : "—"} icon={TrendingUp} />
        <Metric label="Günlük Ortalama" value={current ? formatMoney(current.grossRevenue / Math.max(1, new Date(current.year, current.month, 0).getDate()), current.currency) : "—"} icon={TrendingUp} />
        <Metric label="En Yüksek Günlük" value={current ? formatMoney(maxDaily, current.currency) : "—"} icon={TrendingUp} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Sağlık Skoru" value={healthScore ?? "Hazır"} icon={TrendingUp} />
        <Metric label="Aktif Plan" value={activePlanCount} icon={FileText} />
        <Metric label="Son Denetim Puanı" value={lastAuditScore ?? "—"} icon={ShieldCheck} />
      </div>

      <div className="rounded-lg border border-[#dfe4dc] bg-white p-4">
        <h3 className="font-semibold">Ciro Eğrisi</h3>
        <div className="mt-4 flex h-56 items-end gap-2 border-b border-l border-[#dfe4dc] p-3">
          {finalRecords.slice(-12).map((record) => (
            <div key={record.id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full items-end justify-center">
                {record.targetRevenue ? <div className="absolute bottom-0 w-full rounded-t bg-amber-200" style={{ height: `${Math.max(4, (record.targetRevenue / max) * 180)}px` }} /> : null}
                <div className="relative z-10 w-2/3 rounded-t bg-[#17201b]" style={{ height: `${Math.max(4, (record.grossRevenue / max) * 180)}px` }} />
              </div>
              <span className="text-xs text-[#65705f]">{String(record.month).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
          <p>Dönem başlangıcı: <b>{first ? formatMoney(first.grossRevenue, first.currency) : "—"}</b></p>
          <p>Dönem sonu: <b>{last ? formatMoney(last.grossRevenue, last.currency) : "—"}</b></p>
          <p>Toplam büyüme: <b>{first && last ? formatMoney(last.grossRevenue - first.grossRevenue, last.currency) : "—"}</b></p>
          <p>Büyüme oranı: <b>{first && last ? formatPercent(percentChange(last.grossRevenue, first.grossRevenue)) : "—"}</b></p>
          <p>En yüksek ay: <b>{highest ? periodLabel(highest.year, highest.month) : "—"}</b></p>
          <p>En düşük ay: <b>{lowest ? periodLabel(lowest.year, lowest.month) : "—"}</b></p>
          <p>Ortalama aylık: <b>{last ? formatMoney(average, last.currency) : "—"}</b></p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#dfe4dc]">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-[#f8faf6] text-xs uppercase text-[#65705f]">
            <tr>{["Dönem", "Gerçekleşen", "Hedef", "Hedef Farkı", "Hedef Oranı", "Önceki Ay", "Aylık Değişim", "Kaynak", "Giriş", "Kullanıcı"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {records.map((record, index) => {
              const previousRecord = records[index + 1];
              const targetDiff = record.targetRevenue != null ? record.grossRevenue - record.targetRevenue : null;

              return (
                <tr key={record.id}>
                  <td className="px-4 py-3">{periodLabel(record.year, record.month)}</td>
                  <td className="px-4 py-3">{formatMoney(record.grossRevenue, record.currency)}</td>
                  <td className="px-4 py-3">{formatMoney(record.targetRevenue, record.currency)}</td>
                  <td className="px-4 py-3">{formatMoney(targetDiff, record.currency)}</td>
                  <td className="px-4 py-3">{formatPercent(realizationRate(record.grossRevenue, record.targetRevenue))}</td>
                  <td className="px-4 py-3">{previousRecord ? formatMoney(previousRecord.grossRevenue, previousRecord.currency) : "—"}</td>
                  <td className="px-4 py-3">{previousRecord ? formatPercent(percentChange(record.grossRevenue, previousRecord.grossRevenue)) : "—"}</td>
                  <td className="px-4 py-3">{record.source}</td>
                  <td className="px-4 py-3">{formatDate(record.updatedAt)}</td>
                  <td className="px-4 py-3">{record.enteredBy?.name ?? "—"}</td>
                </tr>
              );
            })}
            {!records.length ? <tr><td colSpan={10} className="p-10 text-center text-[#65705f]">Bu şube için ciro kaydı yok.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => <div key={item} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4 text-sm">{item}</div>)}
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#65705f]">{text}</p>
    </div>
  );
}
