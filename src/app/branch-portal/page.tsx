import Link from "next/link";
import { CalendarClock, CheckSquare, FileWarning, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { branchTaskStatusLabel } from "@/lib/branch-tasks";
import { accessibleBranchIds } from "@/lib/branch-access";
import { formatDate } from "@/lib/franchise";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BranchPortalPage() {
  const ids = await accessibleBranchIds();
  const branchWhere = ids ? { id: { in: ids } } : {};
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const branches = await prisma.branch.findMany({
    where: { archivedAt: null, ...branchWhere },
    select: {
      id: true,
      branchName: true,
      tasks: {
        select: {
          id: true,
          title: true,
          branchId: true,
          dueDate: true,
          status: true,
          requiresPhoto: true,
          requiresVideo: true,
          requiresFile: true,
          requiresDescription: true,
          evidence: { select: { id: true } },
        },
        orderBy: { dueDate: "asc" },
      },
      audits: { select: { score: true }, orderBy: { auditDate: "desc" }, take: 1 },
      developmentPlans: { select: { id: true }, where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, orderBy: { dueDate: "asc" }, take: 5 },
      operationCalendarItems: { select: { id: true, title: true, startAt: true }, where: { startAt: { gte: start } }, orderBy: { startAt: "asc" }, take: 5 },
    },
    orderBy: { branchName: "asc" },
  });
  const tasks = branches.flatMap((branch) => branch.tasks.map((task) => ({ ...task, branch })));
  const openTasks = tasks.filter((task) => ["OPEN", "IN_PROGRESS", "REJECTED"].includes(task.status));
  const todayTasks = openTasks.filter((task) => task.dueDate && task.dueDate >= start && task.dueDate < end);
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < start);
  const evidenceWaiting = tasks.filter((task) => ["OPEN", "IN_PROGRESS", "REJECTED"].includes(task.status) && (task.requiresPhoto || task.requiresVideo || task.requiresFile || task.requiresDescription));
  const approvalWaiting = tasks.filter((task) => ["SUBMITTED", "UNDER_REVIEW"].includes(task.status));
  const rejected = tasks.filter((task) => task.status === "REJECTED");

  return (
    <AppShell activeHref="/branch-portal" eyebrow="Şube portalı" title="Şube Operasyon Paneli">
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Metric title="Açık Görevler" value={openTasks.length} icon={CheckSquare} />
          <Metric title="Bugün Yapılacak" value={todayTasks.length} icon={CalendarClock} />
          <Metric title="Geciken Görevler" value={overdueTasks.length} icon={FileWarning} />
          <Metric title="Kanıt Bekleyen" value={evidenceWaiting.length} icon={FileWarning} />
          <Metric title="Merkez Onayı" value={approvalWaiting.length} icon={ShieldCheck} />
          <Metric title="Reddedilen" value={rejected.length} icon={FileWarning} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Görev Akışı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.slice(0, 12).map((task) => (
                <Link key={task.id} href={`/branches/${task.branchId}?tab=${encodeURIComponent("Görevler")}`} className="block rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{task.title}</p>
                      <p className="mt-1 text-sm text-[#65705f]">{task.branch.branchName} · {formatDate(task.dueDate)}</p>
                    </div>
                    <Badge>{branchTaskStatusLabel(task.status)}</Badge>
                  </div>
                </Link>
              ))}
              {!tasks.length ? <p className="py-10 text-center text-sm text-[#65705f]">Bu portal için görev yok.</p> : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Yaklaşan Operasyon Takvimi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {branches.flatMap((branch) => branch.operationCalendarItems.map((item) => ({ ...item, branch }))).slice(0, 6).map((item) => (
                  <p key={item.id} className="rounded-lg bg-[#f8faf6] p-3 text-sm">{item.branch.branchName} · {item.title} · {formatDate(item.startAt)}</p>
                ))}
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Son Denetim ve Gelişim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {branches.map((branch) => (
                  <div key={branch.id} className="rounded-lg bg-[#f8faf6] p-3 text-sm">
                    <p className="font-semibold">{branch.branchName}</p>
                    <p className="mt-1 text-[#65705f]">Son denetim: {branch.audits[0]?.score ?? "—"} · Açık gelişim: {branch.developmentPlans.length}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: typeof CheckSquare }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <Icon className="size-5 text-[#65705f]" />
        <p className="mt-3 text-sm text-[#65705f]">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
