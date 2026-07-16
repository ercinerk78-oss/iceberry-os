import { AppShell } from "@/components/app-shell";
import { LeadInbox } from "@/components/leads/lead-inbox";
import { statusValuesForFilter, toLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { status?: string; leadCategory?: string; followUp?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
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
        nextFollowUpAt: params.followUp === "overdue" ? { lt: new Date() } : undefined,
      },
      include: { activities: { orderBy: { createdAt: "desc" } } },
      orderBy: { leadDate: "desc" },
    });
  } catch (error) {
    console.error("Lead advanced filters fallback", error);
    records = await prisma.lead.findMany({
      where: { status: params.status ? { in: statusValuesForFilter(params.status) } : undefined },
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
      />
    </AppShell>
  );
}
