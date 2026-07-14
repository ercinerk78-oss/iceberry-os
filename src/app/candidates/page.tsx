import { AppShell } from "@/components/app-shell";
import { CandidateList } from "@/components/candidates/candidate-list";
import { prisma } from "@/lib/prisma";
import { toCandidate } from "@/lib/candidates";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const records = await prisma.franchiseCandidate.findMany({ where: { archivedAt: null }, include: { interactions: { orderBy: { interactionDate: "desc" } }, tasks: { orderBy: { dueDate: "asc" } }, documents: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } });
  const candidates = records.map(toCandidate);
  return <AppShell activeHref="/candidates" eyebrow="Franchise CRM" title="Franchise Adayları"><CandidateList candidates={candidates} /></AppShell>;
}
