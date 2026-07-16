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
              <div className="grid gap-3 md:grid-cols-3">
                <Metric label="Sağlık Skoru" value={branch.healthScore ?? "Hazır"} icon={TrendingUp} />
                <Metric label="Aktif Plan" value={activeDevelopmentPlans.length} icon={FileText} />
                <Metric label="Son Denetim Puanı" value={lastAudit?.score ?? "—"} icon={ShieldCheck} />
              </div>
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
