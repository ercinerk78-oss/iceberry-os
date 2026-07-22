import { AppShell } from "@/components/app-shell";
import { CandidateList } from "@/components/candidates/candidate-list";
import { toCandidate } from "@/lib/candidates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CANDIDATE_LIST_LIMIT = 250;
const RELATED_ITEM_LIMIT = 50;

type Params = { q?: string };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = params.q?.trim();

  const [records, concepts, tags] = await Promise.all([
    prisma.franchiseCandidate.findMany({
      where: {
        archivedAt: null,
        OR: q
          ? [
              { fullName: { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q } },
              { city: { contains: q } },
              { investmentBudget: { contains: q } },
              { interestedConcept: { contains: q } },
              { generalNotes: { contains: q } },
              { interactions: { some: { OR: [{ title: { contains: q } }, { description: { contains: q } }, { nextAction: { contains: q } }] } } },
              { concepts: { some: { concept: { name: { contains: q } } } } },
              { tags: { some: { tag: { name: { contains: q } } } } },
            ]
          : undefined,
      },
      include: {
        interactions: { orderBy: { interactionDate: "desc" }, take: RELATED_ITEM_LIMIT },
        tasks: { orderBy: { dueDate: "asc" }, take: RELATED_ITEM_LIMIT },
        documents: { orderBy: { createdAt: "desc" }, take: RELATED_ITEM_LIMIT },
        concepts: { include: { concept: true } },
        tags: { include: { tag: true } },
        timelineEvents: { orderBy: { eventDate: "desc" }, take: RELATED_ITEM_LIMIT },
      },
      orderBy: { createdAt: "desc" },
      take: CANDIDATE_LIST_LIMIT,
    }),
    prisma.concept.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.candidateTag.findMany({ orderBy: { name: "asc" }, take: 100 }),
  ]);

  return (
    <AppShell activeHref="/candidates" eyebrow="Franchise CRM" title="Franchise Adayları">
      <CandidateList
        candidates={records.map(toCandidate)}
        conceptOptions={concepts.map((concept) => concept.name)}
        tagOptions={tags.map((tag) => tag.name)}
        initialQuery={q ?? ""}
      />
    </AppShell>
  );
}
