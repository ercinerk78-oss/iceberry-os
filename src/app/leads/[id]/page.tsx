import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { LeadDetail } from "@/components/leads/lead-detail";
import { toLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let record;

  try {
    record = await prisma.lead.findUnique({
      where: { id },
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        appointments: { orderBy: { appointmentDate: "desc" } },
        tasks: { orderBy: { dueDate: "asc" } },
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
        },
      },
    });
  } catch (error) {
    console.error("Lead detail advanced data fallback", error);
    record = await prisma.lead.findUnique({
      where: { id },
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
    });
  }

  if (!record) notFound();
  const availableLocations = await prisma.candidateLocation.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true, city: true, district: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <AppShell activeHref="/leads" eyebrow="Lead inceleme" title={record.fullName}>
      <div className="space-y-4">
        <Link href="/leads" className="inline-flex items-center gap-2 text-sm font-medium text-[#65705f]">
          <ArrowLeft className="size-4" />
          Lead Havuzuna dön
        </Link>
        <LeadDetail lead={toLead(record)} availableLocations={availableLocations} />
      </div>
    </AppShell>
  );
}
