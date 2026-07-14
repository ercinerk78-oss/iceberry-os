import { AppShell } from "@/components/app-shell";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { prisma } from "@/lib/prisma";
import { toCandidate } from "@/lib/candidates";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const records = await prisma.franchiseCandidate.findMany({ where: { archivedAt: null }, include: { interactions: { orderBy: { interactionDate: "desc" } }, tasks: { orderBy: { dueDate: "asc" } }, documents: { orderBy: { createdAt: "desc" } } }, orderBy: { updatedAt: "desc" } });
  return <AppShell activeHref="/pipeline" eyebrow="Satış operasyonu" title="Satış Pipeline"><PipelineBoard candidates={records.map(toCandidate)} /></AppShell>;
}
