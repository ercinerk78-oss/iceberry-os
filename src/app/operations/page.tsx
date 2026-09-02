import Link from "next/link";
import { AlertTriangle, ClipboardList, ShieldCheck, TrendingUp } from "lucide-react";

import { approveAudit, publishAuditTemplate, recalculateBranchHealth, startAuditAssignment, submitAudit } from "@/app/operations/actions";
import { AppShell } from "@/components/app-shell";
import { OperationForms, QuickAuditAnswerForm } from "@/components/operations/operation-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withNonHotelMainBranchWhere } from "@/lib/branch-visibility";
import { canManageOperations, operationBranchWhere, requireOperationsUser } from "@/lib/operations/access";
import {
  AUDIT_ASSIGNMENT_STATUS_LABELS,
  AUDIT_RESULT_LABELS,
  AUDIT_TEMPLATE_STATUS_LABELS,
  AUDIT_TYPE_LABELS,
  CORRECTIVE_ACTION_STATUS_LABELS,
  dateTR,
  FINDING_SEVERITY_LABELS,
  label,
  percentTR,
} from "@/lib/operations/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = {
  view?: string;
};

export default async function OperationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const currentView = params.view === "health" ? "health" : "audits";
  const user = await requireOperationsUser();
  const branchWhere = await operationBranchWhere();
  const scopedBranchWhere = withNonHotelMainBranchWhere({ archivedAt: null, ...branchWhere });
  const now = new Date();
  const [
    branches,
    templates,
    assignments,
    audits,
    findings,
    correctiveActions,
    healthScores,
    overdueActions,
  ] = await Promise.all([
    prisma.branch.findMany({ where: scopedBranchWhere, select: { id: true, branchName: true, city: true, district: true, branchCode: true, healthScore: true }, orderBy: { branchName: "asc" }, take: 300 }),
    prisma.auditTemplate.findMany({ include: { sections: true }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 20 }),
    prisma.auditAssignment.findMany({ where: { branch: scopedBranchWhere }, include: { branch: { select: { branchName: true } }, template: { select: { name: true } } }, orderBy: { dueAt: "asc" }, take: 20 }),
    prisma.audit.findMany({
      where: { branch: scopedBranchWhere },
      include: {
        branch: { select: { branchName: true } },
        template: { include: { sections: { include: { questions: { include: { options: true } } } } } },
        answers: { include: { evidences: { where: { evidenceType: "PHOTO" }, select: { id: true } } } },
        evidences: { where: { evidenceType: "PHOTO", documentId: { not: null } }, select: { id: true, caption: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.auditFinding.findMany({ where: { branch: scopedBranchWhere, status: { notIn: ["CLOSED", "VERIFIED"] } }, include: { branch: { select: { branchName: true } } }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.correctiveAction.findMany({ where: { branch: scopedBranchWhere, status: { notIn: ["COMPLETED", "CANCELLED", "APPROVED"] } }, include: { branch: { select: { branchName: true } } }, orderBy: { dueAt: "asc" }, take: 15 }),
    prisma.branchHealthScoreSnapshot.findMany({ where: { branch: scopedBranchWhere }, include: { branch: { select: { id: true, branchName: true, city: true } } }, orderBy: { calculatedAt: "desc" }, take: 300 }),
    prisma.correctiveAction.count({ where: { branch: scopedBranchWhere, dueAt: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED", "APPROVED"] } } }),
  ]);
  const publishedTemplates = templates.filter((template) => template.status === "PUBLISHED");
  const activeAudits = audits.filter((audit) => ["IN_PROGRESS", "SUBMITTED", "REVIEW_REQUIRED"].includes(audit.status));
  const completedAudits = audits.filter((audit) => audit.status === "COMPLETED");
  const assignedAuditCount = assignments.filter((assignment) => ["ASSIGNED", "PLANNED", "OVERDUE"].includes(assignment.status)).length;
  const reviewWaitingCount = audits.filter((audit) => ["SUBMITTED", "REVIEW_REQUIRED"].includes(audit.status)).length;
  const canManage = canManageOperations(user.role);
  const scoredBranches = branches.filter((branch) => branch.healthScore != null);
  const averageHealth = scoredBranches.length ? Math.round(scoredBranches.reduce((sum, branch) => sum + Number(branch.healthScore), 0) / scoredBranches.length) : 0;
  const seenHealthScoreBranches = new Set<string>();
  const latestHealthScores = healthScores.filter((score) => {
    if (seenHealthScoreBranches.has(score.branchId)) return false;
    seenHealthScoreBranches.add(score.branchId);
    return true;
  });
  const openQuestions = activeAudits.flatMap((audit) => {
    const answers = new Map(audit.answers.map((answer) => [answer.questionId, answer]));
    return audit.template.sections.flatMap((section) => section.questions.filter((question) => {
      const answer = answers.get(question.id);
      return !answer || (question.requiresPhoto && !answer.isNotApplicable && answer.evidences.length === 0);
    }).map((question) => {
      const answer = answers.get(question.id);
      return ({
      id: question.id,
      title: `${audit.branch.branchName} · ${question.title}${answer ? " · Fotoğraf bekliyor" : ""}`,
      auditId: audit.id,
      requiresPhoto: question.requiresPhoto,
      photoCount: answer?.evidences.length ?? 0,
      options: question.options.map((option) => ({ label: option.label, value: option.value })),
    });
    }));
  }).slice(0, 30);
  const metrics = [
    { title: "Ortalama Şube Sağlık Puanı", value: averageHealth ? percentTR(averageHealth) : "Veri yok", icon: TrendingUp },
    { title: "Atanan Denetim", value: assignedAuditCount, icon: ClipboardList },
    { title: "Onay Bekleyen", value: reviewWaitingCount, icon: ShieldCheck },
    { title: "Geciken Düzeltme", value: overdueActions, icon: AlertTriangle },
  ];

  return (
    <AppShell activeHref="/operations" eyebrow="Denetim, gelişim ve sağlık puanı" title="Operasyon Denetimi">
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.title} className="shadow-none">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div><p className="text-sm text-[#65705f]">{metric.title}</p><p className="mt-2 text-2xl font-semibold">{metric.value}</p></div>
                <metric.icon className="size-5 text-[#6fbe44]" />
              </CardContent>
            </Card>
          ))}
        </section>

        <OperationsViewTabs currentView={currentView} />

        {currentView === "health" ? (
          <HealthScoresSection
            scores={latestHealthScores}
            canManage={canManage}
            fallbackBranchId={branches[0]?.id}
          />
        ) : canManage ? (
          <>
            <AuditTrackingBoard assignments={assignments} audits={audits} />
            <section className="rounded-lg border border-[#dfe4dc] bg-white p-4">
              <div className="mb-4">
                <h2 className="font-semibold">Yönetim Araçları</h2>
                <p className="mt-1 text-sm text-[#65705f]">Yeni şablon oluşturma, yayımlama ve şubeye denetim atama işlemleri.</p>
              </div>
              <OperationForms branches={branches} templates={publishedTemplates} />
              <TemplateManagementList templates={templates} />
            </section>
            <CorrectiveTrackingPanel findings={findings} correctiveActions={correctiveActions} />
            <CompletedAuditsPanel audits={completedAudits} />
          </>
        ) : <QuickAuditAnswerForm openQuestions={openQuestions} />}
      </div>
    </AppShell>
  );
}

function OperationsViewTabs({ currentView }: { currentView: "audits" | "health" }) {
  const tabs = [
    { label: "Denetim Takibi", href: "/operations", view: "audits" },
    { label: "Şube Sağlık Puanları", href: "/operations?view=health", view: "health" },
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2 rounded-lg border border-[#dfe4dc] bg-white p-2">
      {tabs.map((tab) => (
        <Button key={tab.view} asChild variant={currentView === tab.view ? "default" : "outline"}>
          <Link href={tab.href}>{tab.label}</Link>
        </Button>
      ))}
    </nav>
  );
}

function AuditTrackingBoard({
  assignments,
  audits,
}: {
  assignments: { id: string; auditType: string; status: string; dueAt: Date; priority: string; branch: { branchName: string }; template: { name: string } }[];
  audits: {
    id: string;
    auditType: string;
    status: string;
    result: string;
    percentageScore: unknown;
    createdAt: Date;
    submittedAt: Date | null;
    completedAt: Date | null;
    branch: { branchName: string };
    template: { name: string };
    evidences: { id: string; caption: string | null; createdAt: Date }[];
  }[];
}) {
  const columns = [
    {
      title: "Atandı",
      description: "Şubenin henüz başlatmadığı denetimler",
      tone: "border-blue-200 bg-blue-50/60",
      items: assignments.filter((assignment) => ["ASSIGNED", "PLANNED", "OVERDUE"].includes(assignment.status)),
    },
    {
      title: "Devam Ediyor",
      description: "Cevaplanmakta olan denetimler",
      tone: "border-amber-200 bg-amber-50/60",
      items: audits.filter((audit) => audit.status === "IN_PROGRESS"),
    },
    {
      title: "Onay Bekliyor",
      description: "Merkez kontrolü bekleyenler",
      tone: "border-purple-200 bg-purple-50/60",
      items: audits.filter((audit) => ["SUBMITTED", "REVIEW_REQUIRED"].includes(audit.status)),
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      {columns.map((column) => (
        <Card key={column.title} className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-3 text-base">
              <span>
                {column.title}
                <small className="mt-1 block font-normal text-[#65705f]">{column.description}</small>
              </span>
              <Badge variant="secondary">{column.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {column.items.map((item) => "dueAt" in item ? (
              <AuditAssignmentCard key={item.id} assignment={item} tone={column.tone} />
            ) : (
              <AuditStatusCard key={item.id} audit={item} tone={column.tone} />
            ))}
            {!column.items.length ? <p className="rounded-lg border border-dashed border-[#dfe4dc] p-6 text-center text-sm text-[#65705f]">Bu aşamada kayıt yok.</p> : null}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function HealthScoresSection({
  scores,
  canManage,
  fallbackBranchId,
}: {
  scores: {
    id: string;
    branchId: string;
    score: unknown;
    auditComponent: unknown;
    visitComponent: unknown;
    findingComponent: unknown;
    taskComponent: unknown;
    revenueComponent: unknown;
    supplyComponent: unknown;
    negativeFactors: string | null;
    positiveFactors: string | null;
    calculatedAt: Date;
    branch: { id: string; branchName: string; city: string | null };
  }[];
  canManage: boolean;
  fallbackBranchId?: string;
}) {
  return (
    <section>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Şube Sağlık Puanları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scores.map((score) => (
            <div key={score.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{score.branch.branchName}</p>
                  <p className="text-xs text-[#65705f]">{score.branch.city} · {dateTR(score.calculatedAt)}</p>
                </div>
                <strong>{percentTR(Number(score.score))}</strong>
              </div>
              <p className="mt-2 text-xs text-[#65705f]">{score.negativeFactors || score.positiveFactors || "Açıklanabilir sağlık puanı hesaplandı."}</p>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
                <HealthPart label="Denetim" value={score.auditComponent} />
                <HealthPart label="Ziyaret" value={score.visitComponent ?? 0} />
                <HealthPart label="Düzeltme" value={score.findingComponent} />
                <HealthPart label="Görev" value={score.taskComponent} />
                <HealthPart label="Ciro" value={score.revenueComponent} />
                <HealthPart label="Tedarik" value={score.supplyComponent} />
              </div>
              {canManage ? (
                <form action={recalculateBranchHealth.bind(null, score.branchId)} className="mt-3">
                  <Button size="sm" variant="outline">Puanı Yenile</Button>
                </form>
              ) : null}
            </div>
          ))}
          {!scores.length ? (
            <div className="py-8 text-center text-sm text-[#65705f]">
              Sağlık puanı henüz hesaplanmadı.
              {fallbackBranchId && canManage ? <form action={recalculateBranchHealth.bind(null, fallbackBranchId)} className="mt-3"><Button size="sm" variant="outline">İlk şube için hesapla</Button></form> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function CompletedAuditsPanel({
  audits,
}: {
  audits: {
    id: string;
    auditType: string;
    status: string;
    result: string;
    percentageScore: unknown;
    createdAt: Date;
    submittedAt: Date | null;
    completedAt: Date | null;
    branch: { branchName: string };
    template: { name: string };
    evidences: { id: string; caption: string | null; createdAt: Date }[];
  }[];
}) {
  return (
    <details className="rounded-lg border border-[#dfe4dc] bg-white p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span>
          <span className="font-semibold">Tamamlanan Denetimler</span>
          <span className="mt-1 block text-sm text-[#65705f]">Kapanan denetimler arşivi. Gerektiğinde açıp kontrol edin.</span>
        </span>
        <Badge variant="secondary">{audits.length}</Badge>
      </summary>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {audits.map((audit) => (
          <AuditStatusCard key={audit.id} audit={audit} tone="border-emerald-200 bg-emerald-50/60" />
        ))}
        {!audits.length ? <p className="rounded-lg border border-dashed border-[#dfe4dc] p-6 text-center text-sm text-[#65705f]">Tamamlanan denetim yok.</p> : null}
      </div>
    </details>
  );
}

function TemplateManagementList({
  templates,
}: {
  templates: { id: string; name: string; auditType: string; version: number; status: string; sections: { id: string }[] }[];
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Şablon Durumu</h3>
          <p className="mt-1 text-sm text-[#65705f]">Yayıma hazır şablonları burada hızlıca kontrol edin.</p>
        </div>
        <Badge variant="secondary">{templates.length}</Badge>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {templates.map((template) => (
          <article key={template.id} className="rounded-lg border border-[#dfe4dc] bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{template.name} v{template.version}</p>
                <p className="mt-1 text-xs text-[#65705f]">{label(AUDIT_TYPE_LABELS, template.auditType)} · {template.sections.length} bölüm</p>
              </div>
              <Badge variant="outline">{label(AUDIT_TEMPLATE_STATUS_LABELS, template.status)}</Badge>
            </div>
            {template.status !== "PUBLISHED" ? (
              <form action={publishAuditTemplate.bind(null, template.id)} className="mt-3">
                <Button size="sm" variant="outline">Yayımla</Button>
              </form>
            ) : null}
          </article>
        ))}
        {!templates.length ? <p className="rounded-lg border border-dashed border-[#dfe4dc] bg-white p-6 text-center text-sm text-[#65705f]">Henüz denetim şablonu yok.</p> : null}
      </div>
    </div>
  );
}

function AuditAssignmentCard({
  assignment,
  tone,
}: {
  assignment: { id: string; auditType: string; status: string; dueAt: Date; priority: string; branch: { branchName: string }; template: { name: string } };
  tone: string;
}) {
  return (
    <article className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{assignment.branch.branchName}</p>
          <p className="mt-1 text-xs text-[#65705f]">{assignment.template.name}</p>
        </div>
        <Badge variant="outline">{label(AUDIT_ASSIGNMENT_STATUS_LABELS, assignment.status)}</Badge>
      </div>
      <p className="mt-2 text-xs text-[#65705f]">{label(AUDIT_TYPE_LABELS, assignment.auditType)} · Son tarih {dateTR(assignment.dueAt)}</p>
      {["ASSIGNED", "PLANNED"].includes(assignment.status) ? (
        <form action={startAuditAssignment.bind(null, assignment.id)} className="mt-3">
          <Button size="sm" variant="outline" className="w-full">Başlat</Button>
        </form>
      ) : null}
    </article>
  );
}

function AuditStatusCard({
  audit,
  tone,
}: {
  audit: {
    id: string;
    auditType: string;
    status: string;
    result: string;
    percentageScore: unknown;
    createdAt: Date;
    submittedAt: Date | null;
    completedAt: Date | null;
    branch: { branchName: string };
    template: { name: string };
    evidences: { id: string; caption: string | null; createdAt: Date }[];
  };
  tone: string;
}) {
  return (
    <article className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{audit.branch.branchName}</p>
          <p className="mt-1 text-xs text-[#65705f]">{audit.template.name}</p>
        </div>
        <Badge variant="outline">{label(AUDIT_ASSIGNMENT_STATUS_LABELS, audit.status)}</Badge>
      </div>
      <p className="mt-2 text-xs text-[#65705f]">
        {label(AUDIT_TYPE_LABELS, audit.auditType)} · {label(AUDIT_RESULT_LABELS, audit.result)} · {percentTR(Number(audit.percentageScore))}
      </p>
      <p className="mt-1 text-xs text-[#65705f]">
        {audit.completedAt ? `Kapanış ${dateTR(audit.completedAt)}` : audit.submittedAt ? `Gönderim ${dateTR(audit.submittedAt)}` : `Başlangıç ${dateTR(audit.createdAt)}`}
      </p>
      {audit.evidences.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {audit.evidences.slice(0, 3).map((evidence, index) => (
            <Button key={evidence.id} asChild size="sm" variant="outline">
              <a href={`/api/audit-evidence/${evidence.id}`} target="_blank" rel="noreferrer">Fotoğraf {index + 1}</a>
            </Button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {audit.status === "IN_PROGRESS" ? <form action={submitAudit.bind(null, audit.id)}><Button size="sm" variant="outline">Gönder</Button></form> : null}
        {["SUBMITTED", "REVIEW_REQUIRED"].includes(audit.status) ? <form action={approveAudit.bind(null, audit.id)}><Button size="sm" variant="outline">Onayla ve Kapat</Button></form> : null}
      </div>
    </article>
  );
}

function CorrectiveTrackingPanel({
  findings,
  correctiveActions,
}: {
  findings: { id: string; title: string; description: string; findingNumber: string; severity: string; isCritical: boolean; branch: { branchName: string } }[];
  correctiveActions: { id: string; title: string; description: string | null; status: string; dueAt: Date; branch: { branchName: string } }[];
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Düzeltme Takibi</span>
          <Badge variant="secondary">{findings.length + correctiveActions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Düzeltilmesi Gereken Konular</h3>
          {findings.map((finding) => (
            <article key={finding.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{finding.title}</p>
                <Badge className={finding.isCritical ? "bg-rose-100 text-rose-800" : "bg-orange-100 text-orange-800"}>{label(FINDING_SEVERITY_LABELS, finding.severity)}</Badge>
              </div>
              <p className="mt-1 text-xs text-[#65705f]">{finding.branch.branchName} · {finding.findingNumber}</p>
              <p className="mt-2 text-sm">{finding.description}</p>
            </article>
          ))}
          {!findings.length ? <p className="rounded-lg border border-dashed border-[#dfe4dc] p-6 text-center text-sm text-[#65705f]">Düzeltilmesi gereken açık konu yok.</p> : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Aksiyonlar ve Son Tarihler</h3>
          {correctiveActions.map((action) => (
            <article key={action.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{action.title}</p>
                <Badge variant="outline">{label(CORRECTIVE_ACTION_STATUS_LABELS, action.status)}</Badge>
              </div>
              <p className="mt-1 text-xs text-[#65705f]">{action.branch.branchName} · Son tarih {dateTR(action.dueAt)}</p>
              {action.description ? <p className="mt-2 text-sm">{action.description}</p> : null}
            </article>
          ))}
          {!correctiveActions.length ? <p className="rounded-lg border border-dashed border-[#dfe4dc] p-6 text-center text-sm text-[#65705f]">Açık düzeltme aksiyonu yok.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function HealthPart({ label: partLabel, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-[#edf0e9] bg-white px-3 py-2">
      <span className="block text-[#65705f]">{partLabel}</span>
      <strong className="mt-1 block text-[#17201b]">{percentTR(Number(value))}</strong>
    </div>
  );
}
