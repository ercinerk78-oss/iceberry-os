import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, FileText } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { RelatedDocumentsPanel } from "@/components/documents/related-documents-panel";
import { OpeningChecklistPanel } from "@/components/openings/opening-checklist-panel";
import { ReadinessCheckForm, RiskForm } from "@/components/openings/opening-project-controls";
import { OpeningSupplyPanel } from "@/components/openings/opening-supply-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  dateTR,
  openingProjectStatusLabels,
  openingRiskLevelLabels,
  openingRiskStatusLabels,
} from "@/lib/openings";
import {
  isHotelOpeningConcept,
  weightedOpeningPlanPercentage,
} from "@/lib/opening-checklists";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tabs = ["Kurulum Planı", "Ekipman", "Züccaciye", "Açılış Malı", "Görevler", "Belgeler", "Riskler", "Hazırlık Puanı", "Timeline"];

export default async function OpeningDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "Kurulum Planı" } = await searchParams;
  const activeTab = tabs.includes(tab) ? tab : "Kurulum Planı";
  const project = await prisma.openingProject.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, branchName: true, city: true, status: true, concept: true, conceptType: true } },
      franchiseCandidate: { select: { fullName: true, phone: true, email: true } },
      stages: { include: { _count: { select: { milestones: true, tasks: true } } }, orderBy: { sortOrder: "asc" } },
      milestones: { include: { tasks: true }, orderBy: { dueDate: "asc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      risks: { orderBy: { createdAt: "desc" } },
      readinessChecks: { orderBy: { component: "asc" } },
      setupChecklistItems: {
        include: { logisticsUpdates: { orderBy: { createdAt: "desc" }, take: 3 } },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
      supplyItems: { include: { updates: { orderBy: { createdAt: "desc" }, take: 3 } }, orderBy: [{ section: "asc" }, { category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      documentChecklistItems: { where: { archivedAt: null }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
      targetDateChanges: { orderBy: { createdAt: "desc" } },
      postOpeningReviews: { orderBy: { dayNumber: "asc" } },
    },
  });

  if (!project) {
    const legacy = await prisma.branchOpening.findUnique({ where: { id }, include: { branch: { select: { branchName: true, city: true } } } });
    if (!legacy) notFound();
    return (
      <AppShell activeHref="/openings" eyebrow="Eski açılış kaydı" title={legacy.title}>
        <Card className="p-5 shadow-none">
          <p className="text-sm text-[#65705f]">Bu kayıt eski BranchOpening modeliyle oluşturulmuş. Veri korunuyor; yeni projeler gelişmiş Açılış Projesi motoruyla oluşturulur.</p>
          <Button asChild className="mt-4"><Link href="/openings">Açılış Yönetimine Dön</Link></Button>
        </Card>
      </AppShell>
    );
  }

  const blockers = project.readinessChecks.filter((check) => check.blocker && check.status !== "PASSED");
  const isHotelConcept = isHotelOpeningConcept(project.branchConcept || project.branch.concept || project.branch.conceptType);
  const activeSetupItems = project.setupChecklistItems.filter((item) => !item.archivedAt && !isSupplyChecklistCategory(item.category));
  const setupPercent = weightedOpeningPlanPercentage(activeSetupItems, project.supplyItems);

  return (
    <AppShell activeHref="/openings" eyebrow={project.projectNumber} title={project.name}>
      <div className="space-y-5">
        <div className="flex flex-wrap justify-between gap-3">
          <Button asChild variant="outline"><Link href="/openings">Açılış Yönetimine Dön</Link></Button>
          <div className="flex flex-wrap gap-2">
            <Badge>{openingProjectStatusLabels[project.status]}</Badge>
            <Badge className={project.riskLevel === "CRITICAL" || project.riskLevel === "HIGH" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}>{openingRiskLevelLabels[project.riskLevel]}</Badge>
            <Badge variant="secondary">Hazırlık %{project.openingReadinessScore}</Badge>
          </div>
        </div>

        <Card className="p-5 shadow-none">
          <div className="grid gap-4 md:grid-cols-5">
            <Info label="Şube" value={`${project.branch.branchName} · ${project.branch.city}`} />
            <Info label="Yatırımcı" value={project.investorName || project.franchiseCandidate?.fullName || "Belirtilmedi"} />
            <Info label="Hedef Açılış" value={dateTR(project.targetOpeningDate)} />
            <Info label="İlerleme" value={`%${project.progressPercentage}`} />
            <Info label="Kurulum Planı" value={isHotelConcept ? "Kapsam dışı" : `%${setupPercent}`} />
          </div>
          <div className="mt-4 h-3 rounded bg-[#edf0e9]"><div className="h-3 rounded bg-[#6fbe44]" style={{ width: `${project.progressPercentage}%` }} /></div>
        </Card>

        <nav className="flex gap-2 overflow-x-auto rounded-lg border bg-white p-3">
          {tabs.map((item) => <Button key={item} asChild variant={item === activeTab ? "default" : "outline"} className="shrink-0"><Link href={`/openings/${id}?tab=${encodeURIComponent(item)}`}>{item}</Link></Button>)}
        </nav>

        {activeTab === "Kurulum Planı" ? (
          <OpeningChecklistPanel
            projectId={project.id}
            setupItems={project.setupChecklistItems}
            documentItems={project.documentChecklistItems}
            supplyItems={project.supplyItems}
            isHotelConcept={isHotelConcept}
          />
        ) : null}

        {activeTab === "Ekipman" ? <OpeningSupplyPanel projectId={project.id} section="EKIPMAN" items={project.supplyItems} /> : null}
        {activeTab === "Züccaciye" ? <OpeningSupplyPanel projectId={project.id} section="ZUCCACIYE" items={project.supplyItems} /> : null}
        {activeTab === "Açılış Malı" ? <OpeningSupplyPanel projectId={project.id} section="ACILIS_MALI" items={project.supplyItems} /> : null}

        {activeTab === "Görevler" ? <TaskList tasks={project.tasks} /> : null}
        {activeTab === "Belgeler" ? <RelatedDocumentsPanel relation="opening" relationId={project.id} documents={project.documents} /> : null}

        {activeTab === "Riskler" ? (
          <div className="space-y-4">
            <RiskForm projectId={project.id} />
            {project.risks.map((risk) => <Card key={risk.id} className="p-4 shadow-none"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{risk.title}</p><p className="text-sm text-[#65705f]">{risk.category} · {openingRiskStatusLabels[risk.status]} · {dateTR(risk.dueDate)}</p>{risk.mitigationPlan ? <p className="mt-2 text-sm">{risk.mitigationPlan}</p> : null}</div><Badge className={risk.level === "CRITICAL" ? "bg-rose-100 text-rose-800" : ""}>{openingRiskLevelLabels[risk.level]}</Badge></div></Card>)}
          </div>
        ) : null}

        {activeTab === "Hazırlık Puanı" ? (
          <div className="space-y-4">
            <Card className="p-5 shadow-none"><p className="text-3xl font-semibold">%{project.openingReadinessScore}</p><p className="mt-1 text-sm text-[#65705f]">Kritik engel: {blockers.length}</p></Card>
            {project.readinessChecks.map((check) => <Card key={check.id} className="p-4 shadow-none"><div className="mb-3 flex flex-wrap justify-between gap-2"><strong>{check.title}</strong>{check.blocker ? <Badge className="bg-rose-100 text-rose-800">Engelleyici</Badge> : <Badge variant="secondary">Kontrol</Badge>}</div><ReadinessCheckForm check={check} /></Card>)}
          </div>
        ) : null}

        {activeTab === "Timeline" ? <Timeline project={project} /> : null}

      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-[#f8faf6] p-4"><p className="text-xs font-medium uppercase text-[#65705f]">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>;
}

function isSupplyChecklistCategory(category: string) {
  return category === "Ekipman" || category === "Operasyon Hazırlığı";
}

function TaskList({ tasks }: { tasks: { id: string; title: string; priority: string; status: string; dueDate: Date | null; assignedRole: string | null }[] }) {
  return <div className="space-y-3">{tasks.map((task) => <Card key={task.id} className="p-4 shadow-none"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{task.title}</p><p className="text-sm text-[#65705f]">{task.assignedRole || "Sorumlu atanmadı"} · {dateTR(task.dueDate)}</p></div><div className="flex gap-2"><Badge>{task.status}</Badge><Badge variant="secondary">{task.priority}</Badge></div></div></Card>)}{!tasks.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Görev bulunmuyor.</p> : null}</div>;
}

function Timeline({ project }: { project: { targetDateChanges: { id: string; oldDate: Date; newDate: Date; reason: string; createdAt: Date }[]; postOpeningReviews: { id: string; dayNumber: number; plannedDate: Date; status: string }[] } }) {
  return (
    <div className="space-y-3">
      {project.targetDateChanges.map((change) => <Card key={change.id} className="p-4 shadow-none"><Clock3 className="mb-2 size-5" /><p className="font-semibold">Hedef tarih değişti</p><p className="text-sm text-[#65705f]">{dateTR(change.oldDate)} → {dateTR(change.newDate)} · {change.reason}</p></Card>)}
      {project.postOpeningReviews.map((review) => <Card key={review.id} className="p-4 shadow-none"><FileText className="mb-2 size-5" /><p className="font-semibold">{review.dayNumber}. gün takip</p><p className="text-sm text-[#65705f]">{dateTR(review.plannedDate)} · {review.status}</p></Card>)}
      {!project.targetDateChanges.length && !project.postOpeningReviews.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-[#65705f]">Timeline kaydı henüz oluşmadı.</p> : null}
    </div>
  );
}
