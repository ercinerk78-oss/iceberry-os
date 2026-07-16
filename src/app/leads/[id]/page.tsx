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
  const record = await prisma.lead.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { appointmentDate: "desc" } },
      tasks: { orderBy: { dueDate: "asc" } },
    },
  });

  if (!record) notFound();

  return (
    <AppShell activeHref="/leads" eyebrow="Lead inceleme" title={record.fullName}>
      <div className="space-y-4">
        <Link href="/leads" className="inline-flex items-center gap-2 text-sm font-medium text-[#65705f]">
          <ArrowLeft className="size-4" />
          Lead Havuzuna dön
        </Link>
        <LeadDetail lead={toLead(record)} />
      </div>
    </AppShell>
  );
}
