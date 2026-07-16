import { AppShell } from "@/components/app-shell";
import { TaskListPage, type TaskListItem } from "@/components/tasks/task-list-page";
import { accessibleBranchIds } from "@/lib/branch-access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { filter?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const branchIds = await accessibleBranchIds();
  const [candidateTasks, leadTasks, branchTasks] = await Promise.all([
    prisma.candidateTask.findMany({
      where: { candidate: { archivedAt: null } },
      include: { candidate: { select: { id: true, fullName: true, city: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.leadTask.findMany({
      include: { lead: { select: { id: true, fullName: true, city: true } } },
      orderBy: { dueDate: "asc" },
    }).catch((error) => {
      console.error("Lead task table fallback", error);
      return [];
    }),
    prisma.branchTask.findMany({
      where: branchIds ? { branchId: { in: branchIds } } : undefined,
      include: { branch: { select: { id: true, branchName: true, city: true } } },
      orderBy: { dueDate: "asc" },
    }).catch((error) => {
      console.error("Branch task table fallback", error);
      return [];
    }),
  ]);
  const tasks: TaskListItem[] = [
    ...candidateTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      dueDate: task.dueDate.toISOString(),
      priority: task.priority,
      status: task.status,
      assignedUserId: task.assignedUserId ?? "Atanmadı",
      relation: {
        id: task.candidate.id,
        fullName: task.candidate.fullName,
        city: task.candidate.city,
        href: `/candidates/${task.candidate.id}`,
        type: "candidate" as const,
      },
    })),
    ...leadTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      dueDate: task.dueDate.toISOString(),
      priority: task.priority,
      status: task.status,
      assignedUserId: task.assignedUserId ?? "Atanmadı",
      relation: {
        id: task.lead.id,
        fullName: task.lead.fullName,
        city: task.lead.city,
        href: `/leads/${task.lead.id}`,
        type: "lead" as const,
      },
    })),
    ...branchTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      dueDate: (task.dueDate ?? task.createdAt).toISOString(),
      priority: task.priority,
      status: task.status,
      assignedUserId: task.assignedUserId ?? task.assignedRole ?? "Atanmadı",
      relation: {
        id: task.branch.id,
        fullName: task.branch.branchName,
        city: task.branch.city,
        href: `/branches/${task.branch.id}?tab=${encodeURIComponent("Görevler")}`,
        type: "branch" as const,
      },
    })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <AppShell activeHref="/tasks" eyebrow="Takip ve hatırlatma" title="Görevler">
      <TaskListPage tasks={tasks} initialDate={params.filter} />
    </AppShell>
  );
}
