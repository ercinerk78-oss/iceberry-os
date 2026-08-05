import { AppShell } from "@/components/app-shell";
import { CandidateList } from "@/components/candidates/candidate-list";
import { activeCandidateWhere } from "@/lib/active-records";
import { toCandidate } from "@/lib/candidates";
import { prisma } from "@/lib/prisma";
import { containsInsensitive, phoneDigits } from "@/lib/search";

export const dynamic = "force-dynamic";

const CANDIDATE_LIST_LIMIT = 250;
const LIST_INTERACTION_LIMIT = 1;
const LIST_TASK_LIMIT = 5;

type Params = {
  q?: string;
  status?: string;
  leadCategory?: string;
  followUp?: string;
};

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const referenceNow = new Date();
  const q = params.q?.trim();
  const digits = phoneDigits(q);

  const [records, concepts, tags, availableLocations] = await Promise.all([
    prisma.franchiseCandidate.findMany({
      where: activeCandidateWhere({
        OR: q
          ? [
              { fullName: containsInsensitive(q) },
              { phone: containsInsensitive(q) },
              ...(digits ? [{ phone: containsInsensitive(digits) }] : []),
              { email: containsInsensitive(q) },
              { city: containsInsensitive(q) },
              { investmentBudget: containsInsensitive(q) },
              { interestedConcept: containsInsensitive(q) },
              { generalNotes: containsInsensitive(q) },
              {
                interactions: {
                  some: {
                    OR: [
                      { title: containsInsensitive(q) },
                      { description: containsInsensitive(q) },
                      { nextAction: containsInsensitive(q) },
                    ],
                  },
                },
              },
              { concepts: { some: { concept: { name: containsInsensitive(q) } } } },
              { tags: { some: { tag: { name: containsInsensitive(q) } } } },
            ]
          : undefined,
      }),
      include: {
        interactions: { orderBy: { interactionDate: "desc" }, take: LIST_INTERACTION_LIMIT },
        tasks: { orderBy: { dueDate: "asc" }, take: LIST_TASK_LIMIT },
        concepts: { include: { concept: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
      take: CANDIDATE_LIST_LIMIT,
    }),
    prisma.concept.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.candidateTag.findMany({
      where: {
        candidates: {
          some: {
            candidate: activeCandidateWhere(),
          },
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.candidateLocation.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, city: true, district: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <AppShell activeHref="/candidates" eyebrow="Franchise CRM" title="Franchise Adayları">
      <CandidateList
        candidates={records.map(toCandidate)}
        conceptOptions={concepts.map((concept) => concept.name)}
        tagOptions={tags.map((tag) => tag.name)}
        availableLocations={availableLocations}
        initialQuery={q ?? ""}
        initialStatus={params.status}
        initialCategory={params.leadCategory}
        initialFollowUp={params.followUp}
        referenceNow={referenceNow.getTime()}
      />
    </AppShell>
  );
}
