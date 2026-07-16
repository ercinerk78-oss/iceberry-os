import Link from "next/link";
import { notFound } from "next/navigation";

import { updateBranch } from "@/app/branches/actions";
import { AppShell } from "@/components/app-shell";
import { BranchForm } from "@/components/branches/branch-form";
import { RelatedDocumentsPanel } from "@/components/documents/related-documents-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BRANCH_STATUSES, formatDate, label } from "@/lib/franchise";
import { OPENING_STATUSES, openingLabel } from "@/lib/openings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tabs = [
  "Genel Bilgiler",
  "Açılış Süreci",
  "Dokümanlar",
  "Operasyon",
  "Sevkiyatlar",
  "Bayi Geliştirme Stratejisi",
  "Notlar",
  "Finans",
];

export default async function BranchDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "Genel Bilgiler" } = await searchParams;
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      franchisee: { select: { id: true, companyName: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
      openings: {
        where: { archivedAt: null },
        include: { stages: { include: { tasks: true }, orderBy: { orderIndex: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!branch) notFound();

  const activeOpening = branch.openings.find((opening) => !["COMPLETED", "CANCELLED"].includes(opening.status));
  const activeStage = activeOpening?.stages.find((stage) => stage.status === "IN_PROGRESS");
  const lateTaskCount =
    activeOpening?.stages
      .flatMap((stage) => stage.tasks)
      .filter(
        (task) =>
          task.dueDate &&
          task.dueDate < new Date() &&
          !["COMPLETED", "CANCELLED"].includes(task.status),
      ).length ?? 0;
  const values = {
    franchiseeId: branch.franchiseeId,
    branchName: branch.branchName,
    city: branch.city,
    district: branch.district,
    address: branch.address,
    concept: branch.concept,
    locationType: branch.locationType,
    openingDate: branch.openingDate?.toISOString() ?? "",
    plannedOpeningDate: branch.plannedOpeningDate?.toISOString() ?? "",
    royaltyRate: branch.royaltyRate,
    marketingContributionRate: branch.marketingContributionRate,
    operationsManager: branch.operationsManager,
    status: branch.status,
    generalNotes: branch.generalNotes,
  };

  return (
    <AppShell activeHref="/branches" eyebrow="Şube detayı" title={branch.branchName}>
      <div className="space-y-4">
        <Card className="p-5 shadow-none">
          <Badge>{label(BRANCH_STATUSES, branch.status)}</Badge>
          <p className="mt-2 text-sm text-[#65705f]">
            {branch.city}
            {branch.district ? ` / ${branch.district}` : ""} · {branch.franchisee.companyName} ·
            Planlanan açılış {formatDate(branch.plannedOpeningDate)}
          </p>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="border-b">
            <nav className="flex flex-wrap gap-2">
              {tabs.map((item) => (
                <Button key={item} asChild variant={tab === item ? "default" : "outline"}>
                  <Link href={`/branches/${id}?tab=${encodeURIComponent(item)}`}>{item}</Link>
                </Button>
              ))}
            </nav>
          </CardHeader>
          <CardContent className="p-5">
            {tab === "Genel Bilgiler" ? (
              <BranchForm action={updateBranch.bind(null, id)} owners={[branch.franchisee]} values={values} />
            ) : null}
            {tab === "Açılış Süreci" ? (
              activeOpening ? (
                <div className="rounded-lg border p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{activeOpening.title}</h3>
                      <p className="text-sm text-[#65705f]">
                        {openingLabel(OPENING_STATUSES, activeOpening.status)} · Mevcut aşama:{" "}
                        {activeStage?.title ?? "—"}
                      </p>
                    </div>
                    <Button asChild>
                      <Link href={`/openings/${activeOpening.id}`}>Açılış Detayına Git</Link>
                    </Button>
                  </div>
                  <div className="mt-4 h-2 rounded bg-[#edf0e9]">
                    <div className="h-2 rounded bg-[#6fbe44]" style={{ width: `${activeOpening.progressPercentage}%` }} />
                  </div>
                  <p className="mt-2 text-sm">
                    İlerleme %{activeOpening.progressPercentage} · Planlanan açılış{" "}
                    {formatDate(activeOpening.plannedOpeningDate)} · Geciken görev {lateTaskCount}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <p className="text-[#65705f]">Bu şubenin aktif açılış projesi yok.</p>
                  {["PLANNED", "SETUP"].includes(branch.status) ? (
                    <Button asChild className="mt-3">
                      <Link href="/openings/new">Yeni Açılış Projesi</Link>
                    </Button>
                  ) : null}
                </div>
              )
            ) : null}
            {tab === "Dokümanlar" ? (
              <RelatedDocumentsPanel relation="branch" relationId={id} documents={branch.documents} />
            ) : null}
            {!["Genel Bilgiler", "Açılış Süreci", "Dokümanlar"].includes(tab) ? <Empty title={tab} /> : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#65705f]">
        Bu bölüm sonraki sprint için açıklayıcı durum ekranı olarak hazırlandı.
      </p>
    </div>
  );
}
