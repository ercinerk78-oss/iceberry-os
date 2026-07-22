import { AppShell } from "@/components/app-shell";
import { CandidateList } from "@/components/candidates/candidate-list";
import { toCandidate } from "@/lib/candidates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CANDIDATE_LIST_LIMIT = 250;
const RELATED_ITEM_LIMIT = 20;

export default async function CandidatesPage() {
  const records = await prisma.franchiseCandidate.findMany({
    where: { archivedAt: null },
    include: {
      interactions: { orderBy: { interactionDate: "desc" }, take: RELATED_ITEM_LIMIT },
      tasks: { orderBy: { dueDate: "asc" }, take: RELATED_ITEM_LIMIT },
      documents: { orderBy: { createdAt: "desc" }, take: RELATED_ITEM_LIMIT },
    },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_LIST_LIMIT,
  });

  return (
    <AppShell activeHref="/candidates" eyebrow="Franchise CRM" title="Franchise Adayları">
      <CandidateList candidates={records.map(toCandidate)} />
    </AppShell>
  );
}
