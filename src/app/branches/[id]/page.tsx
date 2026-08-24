import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Check, CheckSquare, ClipboardCheck, FileText, ShieldCheck, TrendingUp } from "lucide-react";

import { completeOperationCalendarItem, updateBranch, updateBranchNotes } from "@/app/branches/actions";
import { cancelBranchVisit, completeBranchVisit, createBranchVisit } from "@/app/branches/visits/actions";
import { startAuditAssignment, submitAudit } from "@/app/operations/actions";
import { AppShell } from "@/components/app-shell";
import { BranchForm } from "@/components/branches/branch-form";
import { BranchTaskPanel } from "@/components/branches/branch-task-panel";
import { RelatedDocumentsPanel } from "@/components/documents/related-documents-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { branchConceptLabel } from "@/lib/branch-concepts";
import { BRANCH_STATUSES, formatDate, label } from "@/lib/franchise";
import { VISIBLE_REVENUE_STATUSES, formatMoney, formatPercent, percentChange, periodLabel, realizationRate } from "@/lib/branch-revenue";
import { safeFindBranchRevenueRecords } from "@/lib/branch-revenue-data";
import { canAccessBranch } from "@/lib/branch-access";
import { currentUser } from "@/lib/auth";
import { OPENING_STATUSES, openingLabel } from "@/lib/openings";
import { AUDIT_ASSIGNMENT_STATUS_LABELS, AUDIT_RESULT_LABELS, AUDIT_TYPE_LABELS, dateTR as operationDateTR, label as operationLabel, percentTR } from "@/lib/operations/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tabs = [
  "Genel",
  "Açılış Süreci",
  "Kullanıcılar",
  "Görevler",
  "Dokümanlar",
  "Denetim Raporları",
  "Operasyon Ziyaretleri",
  "Operasyon Takvimi",
  "KPI ve Performans",
  "Timeline",
  "Notlar",
] as const;
const CANCELLED_VISIT_CLEANUP_CUTOFF = new Date("2026-08-17T13:20:00.000Z");

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
  const user = await currentUser();
  const branch = await prisma.branch.findUnique({
    where: { id },
    select: {
      id: true,
      franchiseeId: true,
      conceptId: true,
      branchName: true,
      city: true,
      district: true,
      address: true,
      latitude: true,
      longitude: true,
      concept: true,
      conceptRelation: true,
      locationType: true,
      openingDate: true,
      plannedOpeningDate: true,
      royaltyRate: true,
      marketingContributionRate: true,
      operationsManager: true,
      status: true,
      generalNotes: true,
      documents: { orderBy: { uploadedAt: "desc" } },
      users: { include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } }, orderBy: { createdAt: "desc" } },
      tasks: { include: { evidence: true }, orderBy: { createdAt: "desc" } },
      audits: { orderBy: { auditDate: "desc" } },
      auditAssignments: { include: { template: { select: { name: true } } }, orderBy: { dueAt: "asc" } },
      operationalAudits: { include: { template: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      visits: { where: { OR: [{ status: { not: "CANCELLED" } }, { updatedAt: { gte: CANCELLED_VISIT_CLEANUP_CUTOFF } }] }, orderBy: [{ plannedAt: "desc" }] },
      operationCalendarItems: { where: { OR: [{ status: { not: "CANCELLED" } }, { updatedAt: { gte: CANCELLED_VISIT_CLEANUP_CUTOFF } }] }, orderBy: { startAt: "asc" } },
      timeline: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 },
      openings: {
        where: { archivedAt: null },
        include: { stages: { include: { tasks: true }, orderBy: { orderIndex: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!branch) notFound();
  const [revenueRecords, conceptOptions] = await Promise.all([
    safeFindBranchRevenueRecords({
      where: { branchId: id },
      include: { enteredBy: { select: { name: true } } },
      orderBy: { periodStart: "desc" },
      take: 36,
    }),
    prisma.branchConcept.findMany({
      where: { OR: [{ isActive: true }, ...(branch.conceptId ? [{ id: branch.conceptId }] : [])] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const activeOpening = branch.openings.find((opening) => !["COMPLETED", "CANCELLED"].includes(opening.status));
  const activeStage = activeOpening?.stages.find((stage) => stage.status === "IN_PROGRESS");
  const openTasks = branch.tasks.filter((task) => ["OPEN", "IN_PROGRESS", "REJECTED", "SUBMITTED", "UNDER_REVIEW"].includes(task.status));
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < new Date());
  const openAuditAssignments = branch.auditAssignments.filter((assignment) => ["ASSIGNED", "PLANNED", "IN_PROGRESS", "OVERDUE"].includes(assignment.status));
  const activeOperationalAudits = branch.operationalAudits.filter((audit) => ["IN_PROGRESS", "SUBMITTED", "REVIEW_REQUIRED"].includes(audit.status));
  const lastOperationalAudit = branch.operationalAudits[0];
  const lastAudit = branch.audits[0];
  const lastAuditScore = lastOperationalAudit ? percentTR(Number(lastOperationalAudit.percentageScore)) : (lastAudit?.score ?? "—");
  const openCalendarItems = branch.operationCalendarItems.filter((item) => item.status !== "COMPLETED");
  const values = {
    ...branch,
    openingDate: branch.openingDate?.toISOString() ?? "",
    plannedOpeningDate: branch.plannedOpeningDate?.toISOString() ?? "",
  };

  return (
    <AppShell activeHref="/branches" eyebrow="Şube operasyon çekirdeği" title={branch.branchName}>
      <div className="space-y-4">
        <Card className="p-5 shadow-none">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{label(BRANCH_STATUSES, branch.status)}</Badge>
                <Badge variant="secondary">Şube</Badge>
                <Badge variant="secondary">{branchConceptLabel(branch.conceptRelation, branch.concept)}</Badge>
              </div>
              <p className="mt-3 text-sm text-[#65705f]">
                {branch.city}
                {branch.district ? ` / ${branch.district}` : ""} · Planlanan açılış {formatDate(branch.plannedOpeningDate)}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <Metric label="Açık Görev" value={openTasks.length} icon={CheckSquare} />
              <Metric label="Geciken Görev" value={overdueTasks.length} icon={CalendarClock} />
              <Metric label="Açık Denetim" value={openAuditAssignments.length + activeOperationalAudits.length} icon={ClipboardCheck} />
              <Metric label="Son Denetim" value={lastAuditScore} icon={ShieldCheck} />
            </div>
          </div>
        </Card>

        <BranchAuditNotice
          branchId={id}
          assignments={openAuditAssignments}
          activeAudits={activeOperationalAudits}
        />

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
            {tab === "Genel" ? <BranchForm action={updateBranch.bind(null, id)} values={values} conceptOptions={conceptOptions} /> : null}
            {tab === "Açılış Süreci" ? <OpeningPanel activeOpening={activeOpening} activeStageTitle={activeStage?.title} /> : null}
            {tab === "Kullanıcılar" ? <UsersPanel users={branch.users} /> : null}
            {tab === "Görevler" ? <BranchTaskPanel branchId={id} tasks={branch.tasks} canReview={!["BRANCH_OWNER", "BRANCH_MANAGER"].includes(user?.role ?? "")} /> : null}
            {tab === "Dokümanlar" ? <RelatedDocumentsPanel relation="branch" relationId={id} documents={branch.documents} /> : null}
            {tab === "Denetim Raporları" ? <AuditPanel assignments={branch.auditAssignments} operationalAudits={branch.operationalAudits} legacyAudits={branch.audits} /> : null}
            {tab === "Operasyon Ziyaretleri" ? <BranchVisitsPanel branchId={id} visits={branch.visits} /> : null}
            {tab === "Operasyon Takvimi" ? <CalendarPanel items={branch.operationCalendarItems} /> : null}
            {tab === "KPI ve Performans" ? (
              <RevenuePerformance records={revenueRecords} healthScore={null} activePlanCount={openCalendarItems.length} lastAuditScore={lastAudit?.score} />
            ) : null}
            {tab === "Timeline" ? <TimelinePanel events={branch.timeline} /> : null}
            {tab === "Notlar" ? <NotesPanel branchId={id} notes={branch.generalNotes} /> : null}
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

function BranchAuditNotice({
  branchId,
  assignments,
  activeAudits,
}: {
  branchId: string;
  assignments: { id: string; auditType: string; status: string; dueAt: Date; template: { name: string } }[];
  activeAudits: { id: string; auditType: string; status: string; result: string; percentageScore: unknown; createdAt: Date; template: { name: string } }[];
}) {
  if (!assignments.length && !activeAudits.length) return null;

  const firstAssignment = assignments[0];
  const firstAudit = activeAudits[0];

  return (
    <Card className="border-[#b9df9c] bg-[#f3faef] shadow-none">
      <CardContent className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6fbe44] text-white">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Bu şubede açık operasyon denetimi var</h2>
            <p className="mt-1 text-sm text-[#65705f]">
              {firstAssignment
                ? `${firstAssignment.template.name} · ${operationLabel(AUDIT_ASSIGNMENT_STATUS_LABELS, firstAssignment.status)} · Son tarih ${operationDateTR(firstAssignment.dueAt)}`
                : `${firstAudit?.template.name} · ${operationLabel(AUDIT_ASSIGNMENT_STATUS_LABELS, firstAudit?.status)} · ${percentTR(Number(firstAudit?.percentageScore ?? 0))}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {firstAssignment && ["ASSIGNED", "PLANNED"].includes(firstAssignment.status) ? (
            <form action={startAuditAssignment.bind(null, firstAssignment.id)}>
              <Button variant="outline">Denetimi Başlat</Button>
            </form>
          ) : null}
          <Button asChild>
            <Link href={`/branches/${branchId}?tab=${encodeURIComponent("Denetim Raporları")}`}>Denetimleri Aç</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditPanel({
  assignments,
  operationalAudits,
  legacyAudits,
}: {
  assignments: { id: string; auditType: string; status: string; dueAt: Date; priority: string; template: { name: string } }[];
  operationalAudits: { id: string; auditType: string; status: string; result: string; percentageScore: unknown; createdAt: Date; submittedAt: Date | null; completedAt: Date | null; template: { name: string } }[];
  legacyAudits: { title: string; status: string; score: number | null; auditDate: Date; criticalCount: number }[];
}) {
  if (!assignments.length && !operationalAudits.length && !legacyAudits.length) return <Empty title="Denetim Raporları" text="Bu şube için denetim kaydı yok." />;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="font-semibold">Yeni Operasyon Denetimleri</h3>
        {assignments.map((assignment) => (
          <article key={assignment.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{assignment.template.name}</p>
                <p className="text-sm text-[#65705f]">
                  {operationLabel(AUDIT_TYPE_LABELS, assignment.auditType)} · Son tarih {operationDateTR(assignment.dueAt)}
                </p>
              </div>
              <Badge variant="outline">{operationLabel(AUDIT_ASSIGNMENT_STATUS_LABELS, assignment.status)}</Badge>
            </div>
            {["ASSIGNED", "PLANNED"].includes(assignment.status) ? (
              <form action={startAuditAssignment.bind(null, assignment.id)} className="mt-3">
                <Button size="sm" variant="outline">Denetimi Başlat</Button>
              </form>
            ) : null}
          </article>
        ))}
        {!assignments.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[#65705f]">Atanmış yeni operasyon denetimi yok.</p> : null}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Aktif ve Tamamlanan Denetimler</h3>
        {operationalAudits.map((audit) => (
          <article key={audit.id} className="rounded-lg border border-[#edf0e9] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{audit.template.name}</p>
                <p className="text-sm text-[#65705f]">
                  {operationLabel(AUDIT_TYPE_LABELS, audit.auditType)} · {operationLabel(AUDIT_RESULT_LABELS, audit.result)} · {percentTR(Number(audit.percentageScore))}
                </p>
                <p className="mt-1 text-xs text-[#65705f]">
                  Oluşturma {operationDateTR(audit.createdAt)}
                  {audit.submittedAt ? ` · Gönderim ${operationDateTR(audit.submittedAt)}` : ""}
                  {audit.completedAt ? ` · Tamamlanma ${operationDateTR(audit.completedAt)}` : ""}
                </p>
              </div>
              <Badge variant="outline">{operationLabel(AUDIT_ASSIGNMENT_STATUS_LABELS, audit.status)}</Badge>
            </div>
            {audit.status === "IN_PROGRESS" ? (
              <form action={submitAudit.bind(null, audit.id)} className="mt-3">
                <Button size="sm" variant="outline">Denetimi Gönder</Button>
              </form>
            ) : null}
          </article>
        ))}
        {!operationalAudits.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-[#65705f]">Başlatılmış operasyon denetimi yok.</p> : null}
      </section>

      {legacyAudits.length ? (
        <section className="space-y-3">
          <h3 className="font-semibold">Eski Denetim Raporları</h3>
          <List items={legacyAudits.map((audit) => `${audit.title} · ${audit.status} · Puan: ${audit.score ?? "—"} · Kritik: ${audit.criticalCount} · ${formatDate(audit.auditDate)}`)} />
        </section>
      ) : null}
    </div>
  );
}

function BranchVisitsPanel({ branchId, visits }: { branchId: string; visits: { id: string; title: string; visitType: string; plannedAt: Date; completedAt: Date | null; status: string; visitorName: string | null; notes: string | null; resultNotes: string | null }[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <form action={createBranchVisit} className="space-y-3 rounded-lg border bg-[#f8faf6] p-4">
        <h3 className="font-semibold">Yeni Operasyon Ziyareti</h3>
        <input type="hidden" name="branchId" value={branchId} />
        <label className="grid gap-2 text-sm font-medium">
          <span>Başlık</span>
          <input name="title" placeholder="Örn. Aylık operasyon ziyareti" className="h-10 rounded-lg border bg-white px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span>Planlanan tarih</span>
          <input required type="datetime-local" name="plannedAt" className="h-10 rounded-lg border bg-white px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span>Sorumlu</span>
          <input name="visitorName" placeholder="Ziyaret sorumlusu" className="h-10 rounded-lg border bg-white px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span>Not</span>
          <textarea name="notes" rows={4} placeholder="Plan notu" className="rounded-lg border bg-white p-3" />
        </label>
        <Button className="w-full">Ziyareti Planla</Button>
      </form>

      <div className="space-y-3">
        {visits.map((visit) => (
          <article key={visit.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{visit.status === "COMPLETED" ? "Gerçekleşti" : visit.status === "CANCELLED" ? "İptal Edildi" : "Planlandı"}</Badge>
              <Badge variant="secondary">{visit.visitType}</Badge>
            </div>
            <h3 className="mt-3 font-semibold">{visit.title}</h3>
            <p className="mt-1 text-sm text-[#65705f]">
              Plan: {formatDate(visit.plannedAt)}{visit.completedAt ? ` · Gerçekleşme: ${formatDate(visit.completedAt)}` : ""}
            </p>
            {visit.visitorName ? <p className="mt-1 text-sm text-[#65705f]">Sorumlu: {visit.visitorName}</p> : null}
            {visit.notes ? <p className="mt-2 text-sm">{visit.notes}</p> : null}
            {visit.resultNotes ? <p className="mt-2 rounded-lg bg-white p-3 text-sm">{visit.resultNotes}</p> : null}
            {visit.status === "PLANNED" ? (
              <>
              <form action={completeBranchVisit.bind(null, visit.id)} className="mt-4 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                <input type="datetime-local" name="completedAt" className="h-10 rounded-lg border bg-white px-3 text-sm" />
                <input name="resultNotes" placeholder="Gerçekleşme notu" className="h-10 rounded-lg border bg-white px-3 text-sm" />
                <Button variant="outline"><Check className="size-4" />Gerçekleşti</Button>
              </form>
              <form action={cancelBranchVisit.bind(null, visit.id)} className="mt-3 grid gap-2 rounded-lg border border-rose-200 bg-white p-2 md:grid-cols-[1fr_auto]">
                <input name="cancellationReason" required placeholder="İptal nedeni" className="h-10 rounded-lg border bg-white px-3 text-sm" />
                <Button variant="destructive">İptal Et</Button>
              </form>
              </>
            ) : null}
          </article>
        ))}
        {!visits.length ? <Empty title="Operasyon Ziyaretleri" text="Bu şube için planlanan veya gerçekleşen ziyaret yok." /> : null}
      </div>
    </div>
  );
}

function CalendarPanel({ items }: { items: { id: string; title: string; description: string | null; eventType: string; startAt: Date; status: string }[] }) {
  if (!items.length) return <Empty title="Operasyon Takvimi" text="Bu şube için operasyon takvimi kaydı yok." />;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{item.status === "COMPLETED" ? "Tamamlandı" : item.status === "CANCELLED" ? "İptal Edildi" : "Planlandı"}</Badge>
                <Badge variant="secondary">{item.eventType}</Badge>
              </div>
              <h3 className="mt-3 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-[#65705f]">{formatDate(item.startAt)}</p>
              {item.description ? <p className="mt-2 text-sm">{item.description}</p> : null}
            </div>
            {item.status === "PLANNED" ? (
              <form action={completeOperationCalendarItem.bind(null, item.id)}>
                <Button size="sm" variant="outline"><Check className="size-4" />Tamamlandı</Button>
              </form>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function NotesPanel({ branchId, notes }: { branchId: string; notes: string | null }) {
  return (
    <form action={updateBranchNotes.bind(null, branchId)} className="grid gap-4 rounded-lg border bg-[#f8faf6] p-4">
      <div>
        <h3 className="font-semibold">Şube Notları</h3>
        <p className="mt-1 text-sm text-[#65705f]">Operasyon, bayi görüşmesi ve şube özelindeki genel notları burada saklayın.</p>
      </div>
      <textarea name="generalNotes" defaultValue={notes ?? ""} rows={8} className="rounded-lg border bg-white p-3" placeholder="Bu şube için not yazın..." />
      <div className="flex justify-end">
        <Button>Notları Kaydet</Button>
      </div>
    </form>
  );
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
  const visibleRecords = records.filter((record) => (VISIBLE_REVENUE_STATUSES as readonly string[]).includes(record.status)).sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  const finalRecords = visibleRecords;
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
        <Metric label="Açık Takvim İşi" value={activePlanCount} icon={FileText} />
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
