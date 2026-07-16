import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Flame, MapPin, Phone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CandidateDetailTabs } from "@/components/candidates/candidate-detail-tabs";
import { CandidateDocumentTabs } from "@/components/documents/candidate-document-tabs";
import { CandidateConversion } from "@/components/franchisees/candidate-conversion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatDate, toCandidate } from "@/lib/candidates";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await prisma.franchiseCandidate.findFirst({ where: { id, archivedAt: null }, include: { branch: { select: { id: true, branchName: true, branchCode: true } }, interactions: { orderBy: { interactionDate: "desc" } }, tasks: { orderBy: { dueDate: "asc" } }, documents: { orderBy: { createdAt: "desc" } } } });
  if (!record) notFound();
  const candidate = toCandidate(record);
  return <AppShell activeHref="/candidates" eyebrow="Franchise aday detayı" title={candidate.fullName}><div className="space-y-4">
    <Link href="/candidates" className="inline-flex items-center gap-2 text-sm font-medium text-[#65705f] hover:text-[#17201b]"><ArrowLeft className="size-4"/>Aday listesine dön</Link>
    <Card className="rounded-lg border-[#dfe4dc] bg-white shadow-none"><CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_auto] xl:items-center"><div><div className="flex flex-wrap gap-2"><Badge className="bg-[#ecfbdc] text-[#2f5f20]">{candidate.status}</Badge><Badge className="bg-rose-100 text-rose-800">{candidate.temperature}</Badge></div><h1 className="mt-4 text-2xl font-semibold md:text-3xl">{candidate.fullName}</h1><div className="mt-3 flex flex-wrap gap-3 text-sm text-[#65705f]"><span className="flex items-center gap-2"><Phone className="size-4"/>{candidate.phone}</span><span className="flex items-center gap-2"><MapPin className="size-4"/>{candidate.city} / {candidate.district}</span><span className="flex items-center gap-2"><CalendarClock className="size-4"/>Sonraki takip: {formatDate(candidate.nextFollowUpAt)}</span><span className="flex items-center gap-2"><Flame className="size-4"/>{candidate.interestedConcept}</span></div></div></CardContent></Card>
    <CandidateConversion candidate={candidate} branch={record.branch}/>
    <CandidateDetailTabs candidate={candidate}/>
    <CandidateDocumentTabs candidate={candidate}/>
  </div></AppShell>;
}
