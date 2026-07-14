import { AppShell } from "@/components/app-shell";
import { TaskListPage, type TaskListItem } from "@/components/tasks/task-list-page";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export default async function TasksPage(){const records=await prisma.candidateTask.findMany({where:{candidate:{archivedAt:null}},include:{candidate:{select:{id:true,fullName:true,city:true}}},orderBy:{dueDate:"asc"}});const tasks:TaskListItem[]=records.map(t=>({id:t.id,title:t.title,description:t.description??"",dueDate:t.dueDate.toISOString(),priority:t.priority,status:t.status,assignedUserId:t.assignedUserId??"Atanmadı",candidate:t.candidate}));return <AppShell activeHref="/tasks" eyebrow="Takip ve hatırlatma" title="Görevler"><TaskListPage tasks={tasks}/></AppShell>}
