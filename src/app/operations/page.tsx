import { AlertTriangle, CalendarClock, ShieldCheck, TrendingUp } from "lucide-react";

import { approveAudit, publishAuditTemplate, recalculateBranchHealth, startAuditAssignment, submitAudit } from "@/app/operations/actions";
import { AppShell } from "@/components/app-shell";
import { OperationForms } from "@/components/operations/operation-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageOperations, operationBranchWhere, requireOperationsUser } from "@/lib/operations/access";
import {
  AUDIT_ASSIGNMENT_STATUS_LABELS,
  AUDIT_RESULT_LABELS,
  AUDIT_TEMPLATE_STATUS_LABELS,
  AUDIT_TYPE_LABELS,
  dateTR,
  FINDING_SEVERITY_LABELS,
  label,
  percentTR,
} from "@/lib/operations/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const user = await requireOperationsUser();
  const branchWhere = await operationBranchWhere();
  const scopedBranchWhere = { archivedAt: null, ...branchWhere };
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
    criticalFindings,
  ] = await Promise.all([
    prisma.branch.findMany({ where: scopedBranchWhere, select: { id: true, branchName: true, city: true, healthScore: true }, orderBy: { branchName: "asc" }, take: 300 }),
    prisma.auditTemplate.findMany({ include: { sections: true }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 20 }),
    prisma.auditAssignment.findMany({ where: { branch: scopedBranchWhere }, include: { branch: { select: { branchName: true } }, template: { select: { name: true } } }, orderBy: { dueAt: "asc" }, take: 20 }),
    prisma.audit.findMany({ where: { branch: scopedBranchWhere }, include: { branch: { select: { branchName: true } }, template: { include: { sections: { include: { questions: { include: { options: true } } } } } }, answers: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.auditFinding.findMany({ where: { branch: scopedBranchWhere, status: { notIn: ["CLOSED", "VERIFIED"] } }, include: { branch: { select: { branchName: true } } }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.correctiveAction.findMany({ where: { branch: scopedBranchWhere, status: { notIn: ["COMPLETED", "CANCELLED", "APPROVED"] } }, include: { branch: { select: { branchName: true } } }, orderBy: { dueAt: "asc" }, take: 15 }),
    prisma.branchHealthScoreSnapshot.findMany({ where: { branch: scopedBranchWhere }, include: { branch: { select: { branchName: true, city: true } } }, orderBy: { calculatedAt: "desc" }, take: 12 }),
    prisma.correctiveAction.count({ where: { branch: scopedBranchWhere, dueAt: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED", "APPROVED"] } } }),
    prisma.auditFinding.count({ where: { branch: scopedBranchWhere, isCritical: true, status: { notIn: ["CLOSED", "VERIFIED"] } } }),
  ]);
  const publishedTemplates = templates.filter((template) => template.status === "PUBLISHED");
  const activeAudits = audits.filter((audit) => ["IN_PROGRESS", "SUBMITTED", "REVIEW_REQUIRED"].includes(audit.status));
  const averageHealth = branches.length ? Math.round(branches.reduce((sum, branch) => sum + (branch.healthScore ?? 0), 0) / branches.length) : 0;
  const openQuestions = activeAudits.flatMap((audit) => {
    const answered = new Set(audit.answers.map((answer) => answer.questionId));
    return audit.template.sections.flatMap((section) => section.questions.filter((question) => !answered.has(question.id)).map((question) => ({
      id: question.id,
      title: `${audit.branch.branchName} · ${question.title}`,
      auditId: audit.id,
      options: question.options.map((option) => ({ label: option.label, value: option.value })),
    })));
  }).slice(0, 30);
  const metrics = [
    { title: "Ortalama Şube Sağlık Puanı", value: averageHealth ? percentTR(averageHealth) : "Veri yok", icon: TrendingUp },
    { title: "Aktif Denetim", value: activeAudits.length, icon: ShieldCheck },
    { title: "Açık Kritik Bulgu", value: criticalFindings, icon: AlertTriangle },
    { title: "Geciken Düzeltici Faaliyet", value: overdueActions, icon: CalendarClock },
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

        {canManageOperations(user.role) ? <OperationForms branches={branches} templates={publishedTemplates} openQuestions={openQuestions} /> : null}

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Denetim Şablonları</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-medium">{template.name} v{template.version}</p><p className="text-xs text-[#65705f]">{label(AUDIT_TYPE_LABELS, template.auditType)} · {template.sections.length} bölüm</p></div>
                    <Badge variant="outline">{label(AUDIT_TEMPLATE_STATUS_LABELS, template.status)}</Badge>
                  </div>
                  {canManageOperations(user.role) && template.status !== "PUBLISHED" ? <form action={publishAuditTemplate.bind(null, template.id)} className="mt-3"><Button size="sm" variant="outline">Yayımla</Button></form> : null}
                </div>
              ))}
              {!templates.length ? <p className="py-8 text-center text-sm text-[#65705f]">Henüz denetim şablonu yok.</p> : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Denetim Atamaları</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-medium">{assignment.branch.branchName}</p><p className="text-xs text-[#65705f]">{assignment.template.name} · Son tarih {dateTR(assignment.dueAt)}</p></div>
                    <Badge variant="outline">{label(AUDIT_ASSIGNMENT_STATUS_LABELS, assignment.status)}</Badge>
                  </div>
                  {canManageOperations(user.role) && ["ASSIGNED", "PLANNED"].includes(assignment.status) ? <form action={startAuditAssignment.bind(null, assignment.id)} className="mt-3"><Button size="sm" variant="outline">Başlat</Button></form> : null}
                </div>
              ))}
              {!assignments.length ? <p className="py-8 text-center text-sm text-[#65705f]">Denetim ataması yok.</p> : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Aktif Denetimler</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {audits.map((audit) => (
                <div key={audit.id} className="rounded-lg border border-[#edf0e9] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-medium">{audit.branch.branchName}</p><p className="text-xs text-[#65705f]">{label(AUDIT_TYPE_LABELS, audit.auditType)} · {label(AUDIT_RESULT_LABELS, audit.result)} · {percentTR(Number(audit.percentageScore))}</p></div>
                    <Badge variant="outline">{label(AUDIT_ASSIGNMENT_STATUS_LABELS, audit.status)}</Badge>
                  </div>
                  {canManageOperations(user.role) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {audit.status === "IN_PROGRESS" ? <form action={submitAudit.bind(null, audit.id)}><Button size="sm" variant="outline">Gönder</Button></form> : null}
                      {["SUBMITTED", "REVIEW_REQUIRED"].includes(audit.status) ? <form action={approveAudit.bind(null, audit.id)}><Button size="sm" variant="outline">Onayla</Button></form> : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {!audits.length ? <p className="py-8 text-center text-sm text-[#65705f]">Denetim kaydı yok.</p> : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Şube Sağlık Puanları</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {healthScores.map((score) => (
                <div key={score.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <div className="flex items-center justify-between gap-3"><div><p className="font-medium">{score.branch.branchName}</p><p className="text-xs text-[#65705f]">{score.branch.city} · {dateTR(score.calculatedAt)}</p></div><strong>{percentTR(Number(score.score))}</strong></div>
                  <p className="mt-2 text-xs text-[#65705f]">{score.negativeFactors || score.positiveFactors || "Açıklanabilir sağlık puanı hesaplandı."}</p>
                </div>
              ))}
              {!healthScores.length ? (
                <div className="py-8 text-center text-sm text-[#65705f]">
                  Sağlık puanı henüz hesaplanmadı.
                  {branches[0] && canManageOperations(user.role) ? <form action={recalculateBranchHealth.bind(null, branches[0].id)} className="mt-3"><Button size="sm" variant="outline">İlk şube için hesapla</Button></form> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Açık Bulgular</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {findings.map((finding) => (
                <div key={finding.id} className="rounded-lg border border-[#edf0e9] p-3">
                  <div className="flex items-center justify-between gap-3"><p className="font-medium">{finding.title}</p><Badge className={finding.isCritical ? "bg-rose-100 text-rose-800" : "bg-orange-100 text-orange-800"}>{label(FINDING_SEVERITY_LABELS, finding.severity)}</Badge></div>
                  <p className="mt-1 text-xs text-[#65705f]">{finding.branch.branchName} · {finding.findingNumber}</p>
                  <p className="mt-2 text-sm">{finding.description}</p>
                </div>
              ))}
              {!findings.length ? <p className="py-8 text-center text-sm text-[#65705f]">Açık bulgu yok.</p> : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader><CardTitle>Düzeltici Faaliyetler</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {correctiveActions.map((action) => (
                <div key={action.id} className="rounded-lg border border-[#edf0e9] bg-[#f8faf6] p-3">
                  <div className="flex items-center justify-between gap-3"><p className="font-medium">{action.title}</p><Badge variant="outline">{action.status}</Badge></div>
                  <p className="mt-1 text-xs text-[#65705f]">{action.branch.branchName} · Son tarih {dateTR(action.dueAt)}</p>
                  <p className="mt-2 text-sm">{action.description}</p>
                </div>
              ))}
              {!correctiveActions.length ? <p className="py-8 text-center text-sm text-[#65705f]">Açık düzeltici faaliyet yok.</p> : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
