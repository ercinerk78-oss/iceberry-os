import { AppShell } from "@/components/app-shell";
import { CandidateList } from "@/components/candidates/candidate-list";
import { toCandidate } from "@/lib/candidates";
import { statusValuesForFilter, toLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { containsInsensitive, phoneDigits } from "@/lib/search";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const CANDIDATE_LIST_LIMIT = 250;
const LEAD_LIST_LIMIT = 250;
const RELATED_ITEM_LIMIT = 50;

type Params = {
  q?: string;
  leadId?: string;
  status?: string;
  leadCategory?: string;
  followUp?: string;
};

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const referenceNow = new Date();
  const q = params.q?.trim();
  const digits = phoneDigits(q);

  const leadSearchWhere = q
    ? {
        OR: [
          { fullName: containsInsensitive(q) },
          { phone: containsInsensitive(q) },
          ...(digits ? [{ normalizedPhone: containsInsensitive(digits) }, { phone: containsInsensitive(digits) }] : []),
          { email: containsInsensitive(q) },
          { normalizedEmail: containsInsensitive(q) },
          { city: containsInsensitive(q) },
          { requestedConcept: containsInsensitive(q) },
          { investmentBudget: containsInsensitive(q) },
          { description: containsInsensitive(q) },
          { activities: { some: { description: containsInsensitive(q) } } },
          { concepts: { some: { concept: { name: containsInsensitive(q) } } } },
        ],
      }
    : undefined;
  const leadWhere: Prisma.LeadWhereInput = {
    OR: params.leadId
      ? [
          { id: params.leadId },
          { convertedCandidateId: null },
        ]
      : [{ convertedCandidateId: null }],
    AND: [
      ...(params.status
        ? [
            {
              OR: [
                { processStatus: { in: statusValuesForFilter(params.status) } },
                { status: { in: statusValuesForFilter(params.status) } },
              ],
            },
          ]
        : []),
      ...(params.leadCategory ? [{ leadCategory: params.leadCategory }] : []),
      ...(params.followUp === "overdue" ? [{ nextFollowUpAt: { lt: referenceNow } }] : []),
      ...(leadSearchWhere ? [leadSearchWhere] : []),
    ],
  };

  const [records, leads, concepts, tags, availableLocations] = await Promise.all([
    prisma.franchiseCandidate.findMany({
      where: {
        archivedAt: null,
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
    prisma.lead.findMany({
      where: leadWhere,
      include: {
        activities: { orderBy: { createdAt: "desc" }, take: RELATED_ITEM_LIMIT },
        concepts: { include: { concept: true } },
        appointments: { orderBy: { appointmentDate: "desc" }, take: RELATED_ITEM_LIMIT },
        tasks: { orderBy: { dueDate: "asc" }, take: RELATED_ITEM_LIMIT },
        candidateLocations: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true,
                areaM2: true,
                monthlyRent: true,
                transferFee: true,
                status: true,
                documents: {
                  where: { archivedAt: null },
                  select: { id: true, fileName: true, documentType: true, archivedAt: true },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: RELATED_ITEM_LIMIT,
        },
      },
      orderBy: { leadDate: "desc" },
      take: LEAD_LIST_LIMIT,
    }),
    prisma.concept.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.candidateTag.findMany({ orderBy: { name: "asc" }, take: 100 }),
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
        leads={leads.map(toLead)}
        conceptOptions={concepts.map((concept) => concept.name)}
        tagOptions={tags.map((tag) => tag.name)}
        availableLocations={availableLocations}
        initialQuery={q ?? ""}
        initialLeadId={params.leadId}
        initialStatus={params.status}
        initialCategory={params.leadCategory}
        initialFollowUp={params.followUp}
        referenceNow={referenceNow.getTime()}
      />
    </AppShell>
  );
}
