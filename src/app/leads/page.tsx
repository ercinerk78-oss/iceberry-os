import { AppShell } from "@/components/app-shell";
import { LeadInbox } from "@/components/leads/lead-inbox";
import { statusValuesForFilter, toLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { containsInsensitive, phoneDigits } from "@/lib/search";

export const dynamic = "force-dynamic";

type Params = { status?: string; leadCategory?: string; followUp?: string; q?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const referenceNow = new Date();
  const q = params.q?.trim();
  const digits = phoneDigits(q);
  let records;

  try {
    records = await prisma.lead.findMany({
      where: {
        OR: params.status
          ? [
              { processStatus: { in: statusValuesForFilter(params.status) } },
              { status: { in: statusValuesForFilter(params.status) } },
            ]
          : undefined,
        leadCategory: params.leadCategory || undefined,
        nextFollowUpAt: params.followUp === "overdue" ? { lt: referenceNow } : undefined,
        AND: q
          ? [
              {
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
              },
            ]
          : undefined,
      },
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        concepts: { include: { concept: true } },
      },
      orderBy: { leadDate: "desc" },
    });
  } catch (error) {
    console.error("Lead advanced filters fallback", error);
    records = await prisma.lead.findMany({
      where: {
        status: params.status ? { in: statusValuesForFilter(params.status) } : undefined,
        OR: q
          ? [
              { fullName: containsInsensitive(q) },
              { phone: containsInsensitive(q) },
              ...(digits ? [{ normalizedPhone: containsInsensitive(digits) }, { phone: containsInsensitive(digits) }] : []),
              { email: containsInsensitive(q) },
              { city: containsInsensitive(q) },
              { requestedConcept: containsInsensitive(q) },
              { description: containsInsensitive(q) },
            ]
          : undefined,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        city: true,
        source: true,
        requestedConcept: true,
        status: true,
        leadDate: true,
        convertedCandidateId: true,
        invalidReason: true,
        invalidReasonDetail: true,
        investmentBudget: true,
        description: true,
        activities: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { leadDate: "desc" },
    });
  }

  return (
    <AppShell activeHref="/leads" eyebrow="Dönüşüm öncesi inceleme" title="Lead Havuzu">
      <LeadInbox
        leads={records.map(toLead)}
        initialStatus={params.status}
        initialCategory={params.leadCategory}
        initialFollowUp={params.followUp}
        referenceNow={referenceNow.getTime()}
        initialQuery={q ?? ""}
      />
    </AppShell>
  );
}
