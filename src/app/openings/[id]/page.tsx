import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, FileText, Play, ShieldCheck } from "lucide-react";

import { completeProjectMilestone, markProjectOpened, setProjectStageStatus } from "@/app/openings/actions";
import { AppShell } from "@/components/app-shell";
import { RelatedDocumentsPanel } from "@/components/documents/related-documents-panel";
import { BudgetForm, ReadinessCheckForm, RiskForm, TargetDateForm } from "@/components/openings/opening-project-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  dateTR,
  moneyTR,
  openingBudgetStatusLabels,
  openingMilestoneStatusLabels,
  openingPriorityLabels,
  openingProjectStatusLabels,
  openingRiskLevelLabels,
  openingRiskStatusLabels,
  openingStageStatusLabels,
} from "@/lib/openings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tabs = ["Süreç", "Kilometre Taşları", "Görevler", "Belgeler", "Bütçe", "Riskler", "Hazırlık Puanı", "Takvim", "Timeline", "Açılış Özeti"];

export default async function OpeningDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "Süreç" } = await searchParams;
  const project = await prisma.openingProject.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, branchName: true, city: true, status: true } },
      franchiseCandidate: { select: { fullName: true, phone: true, email: true } },
      stages: { include: { milestones: { orderBy: { dueDate: "asc" } }, tasks: true }, orderBy: { sortOrder: "asc" } },
      milestones: { include: { tasks: true }, orderBy: { dueDate: "asc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      budgetItems: { orderBy: { createdAt: "desc" } },
      risks: { orderBy: { createdAt: "desc" } },
      readinessChecks: { orderBy: { component: "asc" } },
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

  const now = new Date();
  const overdueMilestones = project.milestones.filter((m) => m.dueDate && m.dueDate < now && !["COMPLETED", "CANCELLED", "SKIPPED"].includes(m.status));
  const blockers = project.readinessChecks.filter((check) => check.blocker && check.status !== "PASSED");
  const canOpen = project.openingReadinessScore >= 80 && !overdueMilestones.some((m) => m.isCritical) && !blockers.length && !project.risks.some((risk) => risk.level === "CRITICAL" && ["OPEN", "WATCHING"].includes(risk.status));

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
          <div className="grid gap-4 md:grid-cols-4">
            <Info label="Şube" value={`${project.branch.branchName} · ${project.branch.city}`} />
            <Info label="Yatırımcı" value={project.investorName || project.franchiseCandidate?.fullName || "Belirtilmedi"} />
            <Info label="Hedef Açılış" value={dateTR(project.targetOpeningDate)} />
            <Info label="İlerleme" value={`%${project.progressPercentage}`} />
          </div>
          <div className="mt-4 h-3 rounded bg-[#edf0e9]"><div className="h-3 rounded bg-[#6fbe44]" style={{ width: `${project.progressPercentage}%` }} /></div>
        </Card>

        <nav className="flex gap-2 overflow-x-auto rounded-lg border bg-white p-3">
          {tabs.map((item) => <Button key={item} asChild variant={item === tab ? "default" : "outline"} className="shrink-0"><Link href={`/openings/${id}?tab=${encodeURIComponent(item)}`}>{item}</Link></Button>)}
        </nav>

        {tab === "Süreç" ? (
          <div className="space-y-3">
            {project.stages.map((stage) => (
              <Card key={stage.id} className="p-4 shadow-none">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">{stage.sortOrder}. {stage.nameSnapshot}</p>
                    <p className="text-sm text-[#65705f]">{openingStageStatusLabels[stage.status]} · {dateTR(stage.plannedStartDate)} - {dateTR(stage.plannedEndDate)}</p>
                    <p className="mt-1 text-sm">İlerleme %{stage.progressPercentage} · Kilometre taşı {stage.milestones.length} · Görev {stage.tasks.length}</p>
                  </div>
                  <div className="flex gap-2">
                    {!["IN_PROGRESS", "COMPLETED"].includes(stage.status) ? <form action={setProjectStageStatus.bind(null, stage.id, "IN_PROGRESS")}><Button size="sm"><Play className="size-4" />Başlat</Button></form> : null}
                    {stage.status !== "COMPLETED" ? <form action={setProjectStageStatus.bind(null, stage.id, "COMPLETED")}><Button size="sm" variant="outline"><CheckCircle2 className="size-4" />Tamamla</Button></form> : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {tab === "Kilometre Taşları" ? (
          <div className="space-y-3">
            {project.milestones.map((milestone) => (
              <Card key={milestone.id} className={`p-4 shadow-none ${milestone.isCritical ? "border-amber-200" : ""}`}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2"><Badge>{openingMilestoneStatusLabels[milestone.status]}</Badge><Badge variant="secondary">{openingPriorityLabels[milestone.priority]}</Badge>{milestone.isCritical ? <Badge className="bg-amber-100 text-amber-800">Kritik</Badge> : null}</div>
                    <h3 className="mt-2 font-semibold">{milestone.nameSnapshot}</h3>
                    <p className="mt-1 text-sm text-[#65705f]">Son tarih: {dateTR(milestone.dueDate)} · İlerleme %{milestone.progressPercentage}</p>
                    {milestone.requiresDocument || milestone.requiresAudit || milestone.requiresApproval ? <p className="mt-1 text-xs text-[#65705f]">Gereksinimler: {["Belge", milestone.requiresAudit ? "Denetim" : "", milestone.requiresApproval ? "Onay" : ""].filter(Boolean).join(", ")}</p> : null}
                  </div>
                  {milestone.status !== "COMPLETED" ? <form action={completeProjectMilestone.bind(null, milestone.id)} className="flex gap-2"><input name="note" placeholder="Tamamlama notu" className="h-9 rounded border px-2 text-sm" /><Button size="sm">Tamamla</Button></form> : null}
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {tab === "Görevler" ? <TaskList tasks={project.tasks} /> : null}
        {tab === "Belgeler" ? <RelatedDocumentsPanel relation="opening" relationId={project.id} documents={project.documents} /> : null}

        {tab === "Bütçe" ? (
          <div className="space-y-4">
            <BudgetForm projectId={project.id} />
            <Card className="p-5 shadow-none">
              <div className="grid gap-3 md:grid-cols-4">
                <Info label="Planlanan Bütçe" value={moneyTR(project.plannedBudget, project.currency)} />
                <Info label="Onaylanan Bütçe" value={moneyTR(project.approvedBudget, project.currency)} />
                <Info label="Gerçekleşen Maliyet" value={moneyTR(project.actualCost, project.currency)} />
                <Info label="Sapma" value={moneyTR(project.budgetVariance, project.currency)} />
              </div>
              <div className="mt-4 space-y-2">{project.budgetItems.map((item) => <div key={item.id} className="rounded-lg border p-3 text-sm"><strong>{item.title}</strong> · {item.category} · {moneyTR(item.plannedAmount, item.currency)} · {openingBudgetStatusLabels[item.status]}</div>)}</div>
            </Card>
          </div>
        ) : null}

        {tab === "Riskler" ? (
          <div className="space-y-4">
            <RiskForm projectId={project.id} />
            {project.risks.map((risk) => <Card key={risk.id} className="p-4 shadow-none"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{risk.title}</p><p className="text-sm text-[#65705f]">{risk.category} · {openingRiskStatusLabels[risk.status]} · {dateTR(risk.dueDate)}</p>{risk.mitigationPlan ? <p className="mt-2 text-sm">{risk.mitigationPlan}</p> : null}</div><Badge className={risk.level === "CRITICAL" ? "bg-rose-100 text-rose-800" : ""}>{openingRiskLevelLabels[risk.level]}</Badge></div></Card>)}
          </div>
        ) : null}

        {tab === "Hazırlık Puanı" ? (
          <div className="space-y-4">
            <Card className="p-5 shadow-none"><p className="text-3xl font-semibold">%{project.openingReadinessScore}</p><p className="mt-1 text-sm text-[#65705f]">Kritik engel: {blockers.length}</p></Card>
            {project.readinessChecks.map((check) => <Card key={check.id} className="p-4 shadow-none"><div className="mb-3 flex flex-wrap justify-between gap-2"><strong>{check.title}</strong>{check.blocker ? <Badge className="bg-rose-100 text-rose-800">Engelleyici</Badge> : <Badge variant="secondary">Kontrol</Badge>}</div><ReadinessCheckForm check={check} /></Card>)}
          </div>
        ) : null}

        {tab === "Takvim" ? (
          <div className="space-y-4">
            <TargetDateForm projectId={project.id} />
            {project.stages.map((stage) => <Card key={stage.id} className="p-4 shadow-none"><strong>{stage.nameSnapshot}</strong><p className="text-sm text-[#65705f]">{dateTR(stage.plannedStartDate)} - {dateTR(stage.plannedEndDate)}</p></Card>)}
          </div>
        ) : null}

        {tab === "Timeline" ? <Timeline project={project} /> : null}

        {tab === "Açılış Özeti" ? (
          <Card className="p-5 shadow-none">
            <div className="grid gap-3 md:grid-cols-4">
              <Info label="Kritik gecikme" value={overdueMilestones.length.toString()} />
              <Info label="Açık risk" value={project.risks.filter((r) => ["OPEN", "WATCHING"].includes(r.status)).length.toString()} />
              <Info label="Hazırlık puanı" value={`%${project.openingReadinessScore}`} />
              <Info label="Sonrası takip" value={`${project.postOpeningReviews.length}/4`} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {canOpen ? <form action={markProjectOpened.bind(null, project.id)}><Button><ShieldCheck className="size-4" />Şubeyi Açıldı Olarak İşaretle</Button></form> : <p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="size-4" />Açılış için kritik kriterler tamamlanmalı.</p>}
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-[#f8faf6] p-4"><p className="text-xs font-medium uppercase text-[#65705f]">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>;
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
