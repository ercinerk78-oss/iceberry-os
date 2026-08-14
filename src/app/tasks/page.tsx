import { AppShell } from "@/components/app-shell";
import { TaskListPage, type TaskListItem } from "@/components/tasks/task-list-page";
import { activeCandidateWhere } from "@/lib/active-records";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { filter?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const candidateTasks = await prisma.candidateTask.findMany({
    where: { candidate: activeCandidateWhere() },
    include: { candidate: { select: { id: true, fullName: true, city: true } } },
    orderBy: { dueDate: "asc" },
  });

  const tasks: TaskListItem[] = candidateTasks
    .map((task) => ({
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
    }))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <AppShell activeHref="/tasks" eyebrow="Franchise aday takibi" title="Görevler">
      <TaskListPage tasks={tasks} initialDate={params.filter} />
    </AppShell>
  );
}
