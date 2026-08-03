import { AppShell } from "@/components/app-shell";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { activeCandidateWhere, activeLeadWhere } from "@/lib/active-records";
import { toCandidate } from "@/lib/candidates";
import { toLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PIPELINE_LIST_LIMIT = 200;
const RECENT_INTERACTION_LIMIT = 5;
const OPEN_TASK_LIMIT = 10;

export default async function PipelinePage() {
  const [records, leads] = await Promise.all([
    prisma.franchiseCandidate.findMany({
      where: activeCandidateWhere(),
      include: {
        interactions: { orderBy: { interactionDate: "desc" }, take: RECENT_INTERACTION_LIMIT },
        tasks: { orderBy: { dueDate: "asc" }, take: OPEN_TASK_LIMIT },
        concepts: { include: { concept: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: PIPELINE_LIST_LIMIT,
    }),
    prisma.lead.findMany({
      where: activeLeadWhere(),
      include: {
        activities: { orderBy: { createdAt: "desc" }, take: RECENT_INTERACTION_LIMIT },
        concepts: { include: { concept: true } },
        appointments: { orderBy: { appointmentDate: "desc" }, take: RECENT_INTERACTION_LIMIT },
        tasks: { orderBy: { dueDate: "asc" }, take: OPEN_TASK_LIMIT },
      },
      orderBy: { leadDate: "desc" },
      take: PIPELINE_LIST_LIMIT,
    }),
  ]);

  return (
    <AppShell activeHref="/pipeline" eyebrow="Satış operasyonu" title="Satış Pipeline">
      <PipelineBoard candidates={records.map(toCandidate)} leads={leads.map(toLead)} />
    </AppShell>
  );
}
