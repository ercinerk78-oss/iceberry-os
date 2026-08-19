import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Flame, MapPin, Phone } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CandidateDetailTabs } from "@/components/candidates/candidate-detail-tabs";
import { CandidateConversion } from "@/components/franchisees/candidate-conversion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, toCandidate } from "@/lib/candidates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const activeOpeningStatuses = ["DRAFT", "PLANNING", "IN_PROGRESS", "ON_HOLD", "AT_RISK", "DELAYED", "READY_FOR_REVIEW", "READY_FOR_OPENING", "OPENED", "POST_OPENING"] as const;
const INITIAL_NOTE_LIMIT = 5;
const detailTabs = ["general", "notes", "locations", "tasks", "timeline", "documents"] as const;
type DetailTab = (typeof detailTabs)[number];

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tab = detailTabs.includes(query.tab as DetailTab) ? (query.tab as DetailTab) : "general";
  const record = await prisma.franchiseCandidate.findFirst({
    where: { id },
    include: {
      branch: {
        select: {
          id: true,
          branchName: true,
          openingProjects: {
            where: { archivedAt: null, status: { in: [...activeOpeningStatuses] } },
            select: { id: true, projectNumber: true, name: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      openingProjects: {
        where: { archivedAt: null, status: { in: [...activeOpeningStatuses] } },
        select: { id: true, projectNumber: true, name: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      interactions: { orderBy: { interactionDate: "desc" }, take: INITIAL_NOTE_LIMIT },
      concepts: { include: { concept: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!record) notFound();

  const [users, availableLocations] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        archivedAt: null,
        role: { in: ["GENERAL_MANAGER", "OPERATIONS_MANAGER", "OPENING_COORDINATOR", "ARCHITECTURE_PROJECT_IMPLEMENTATION"] },
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    Promise.resolve([] as { id: string; name: string; city: string; district: string | null }[]),
  ]);
  const candidate = toCandidate(record);
  const openingProject = record.branch?.openingProjects[0] ?? record.openingProjects[0] ?? null;
  const backHref = candidate.archivedAt ? "/candidates?view=passive" : "/candidates";

  return (
    <AppShell activeHref="/candidates" eyebrow="Franchise aday detayı" title={candidate.fullName}>
      <div className="space-y-4">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-[#65705f] hover:text-[#17201b]">
          <ArrowLeft className="size-4" />
          {candidate.archivedAt ? "Pasif aday listesine dön" : "Aday listesine dön"}
        </Link>
        <Card className="rounded-lg border-[#dfe4dc] bg-white shadow-none">
          <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#ecfbdc] text-[#2f5f20]">{candidate.status}</Badge>
                <Badge className="bg-rose-100 text-rose-800">{candidate.temperature}</Badge>
                {candidate.archivedAt ? <Badge variant="outline">Pasif Aday</Badge> : null}
              </div>
              <h1 className="mt-4 text-2xl font-semibold md:text-3xl">{candidate.fullName}</h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#65705f]">
                <span className="flex items-center gap-2"><Phone className="size-4" />{candidate.phone}</span>
                <span className="flex items-center gap-2"><MapPin className="size-4" />{candidate.city} / {candidate.district}</span>
                <span className="flex items-center gap-2"><CalendarClock className="size-4" />Sonraki takip: {formatDate(candidate.nextFollowUpAt)}</span>
                <span className="flex items-center gap-2"><Flame className="size-4" />{candidate.interestedConcept}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        {candidate.archivedAt ? null : (
          <CandidateConversion
            candidate={candidate}
            branch={record.branch ? { id: record.branch.id, branchName: record.branch.branchName } : null}
            openingProject={openingProject}
            users={users}
          />
        )}
        <CandidateDetailTabs candidate={candidate} availableLocations={availableLocations} activeTab={tab} />
      </div>
    </AppShell>
  );
}
