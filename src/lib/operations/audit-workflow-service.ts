import { Prisma } from "@prisma/client";

import { AuditScoringService } from "@/lib/operations/audit-scoring-service";
import { prisma } from "@/lib/prisma";

export class AuditWorkflowService {
  async startAssignment(assignmentId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const assignment = await tx.auditAssignment.findUnique({ where: { id: assignmentId }, include: { template: true } });
      if (!assignment) throw new Error("Denetim ataması bulunamadı.");
      if (assignment.template.status !== "PUBLISHED") throw new Error("Yalnızca yayımlanmış şablonla denetim başlatılabilir.");
      const existing = await tx.audit.findUnique({ where: { assignmentId } });
      if (existing) return existing;
      const audit = await tx.audit.create({
        data: {
          assignmentId,
          branchId: assignment.branchId,
          templateId: assignment.templateId,
          templateVersion: assignment.templateVersion,
          auditType: assignment.auditType,
          auditorId: userId,
          startedAt: new Date(),
          status: "IN_PROGRESS",
          passingScore: assignment.template.passingScore,
        },
      });
      await tx.auditAssignment.update({ where: { id: assignmentId }, data: { status: "IN_PROGRESS" } });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: assignment.branchId,
          userId,
          action: "AUDIT_STARTED",
          entityType: "Audit",
          entityId: audit.id,
          description: "Denetim başlatıldı.",
        },
      });
      return audit;
    });
  }

  async submitAudit(auditId: string, userId: string) {
    const score = await new AuditScoringService().scoreAudit(auditId);
    return prisma.$transaction(async (tx) => {
      const audit = await tx.audit.update({
        where: { id: auditId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          requiresFollowUp: score.requiresFollowUp,
          followUpDueAt: score.requiresFollowUp ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) : null,
        },
      });
      if (audit.assignmentId) {
        await tx.auditAssignment.update({ where: { id: audit.assignmentId }, data: { status: "SUBMITTED" } });
      }
      await tx.notification.create({
        data: {
          role: "OPERATIONS_MANAGER",
          type: "AUDIT_SUBMITTED",
          title: "Denetim inceleme bekliyor",
          message: "Şube denetimi gönderildi ve yönetici incelemesi bekliyor.",
          entityType: "Audit",
          entityId: audit.id,
        },
      });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: audit.branchId,
          userId,
          action: "AUDIT_SUBMITTED",
          entityType: "Audit",
          entityId: audit.id,
          description: "Denetim yönetici incelemesine gönderildi.",
        },
      });
      return audit;
    });
  }

  async approveAudit(auditId: string, reviewerId: string) {
    return prisma.$transaction(async (tx) => {
      const audit = await tx.audit.findUnique({ where: { id: auditId } });
      if (!audit) throw new Error("Denetim bulunamadı.");
      const status = audit.requiresFollowUp ? "REVIEW_REQUIRED" : "COMPLETED";
      const updated = await tx.audit.update({
        where: { id: auditId },
        data: { status, reviewerId, reviewedAt: new Date(), completedAt: status === "COMPLETED" ? new Date() : null },
      });
      if (audit.assignmentId) {
        await tx.auditAssignment.update({ where: { id: audit.assignmentId }, data: { status: status === "COMPLETED" ? "COMPLETED" : "REVIEW_REQUIRED", reviewerId } });
      }
      await tx.branch.update({
        where: { id: audit.branchId },
        data: { lastAuditAt: new Date(), lastAuditScore: Number(audit.percentageScore) },
      });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: audit.branchId,
          userId: reviewerId,
          action: "AUDIT_APPROVED",
          entityType: "Audit",
          entityId: audit.id,
          description: status === "COMPLETED" ? "Denetim onaylandı ve kapatıldı." : "Denetim onaylandı, takip aksiyonları bekleniyor.",
        },
      });
      return updated;
    });
  }

  async createFindingFromAnswer(input: {
    auditId: string;
    answerId: string;
    branchId: string;
    sectionId?: string | null;
    questionId?: string | null;
    title: string;
    description: string;
    severity: string;
    assignedUserId?: string | null;
    createdById?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const repeat = input.questionId ? await tx.auditFinding.findFirst({
        where: { branchId: input.branchId, questionId: input.questionId, status: { notIn: ["CLOSED", "VERIFIED"] } },
        orderBy: { createdAt: "desc" },
      }) : null;
      const finding = await tx.auditFinding.create({
        data: {
          auditId: input.auditId,
          branchId: input.branchId,
          answerId: input.answerId,
          sectionId: input.sectionId ?? undefined,
          questionId: input.questionId ?? undefined,
          findingNumber: `BLG-${Date.now().toString(36).toUpperCase()}`,
          title: input.title,
          description: input.description,
          category: "AUDIT",
          severity: input.severity,
          isCritical: input.severity === "CRITICAL",
          isRepeatFinding: Boolean(repeat),
          previousFindingId: repeat?.id,
          repeatCount: repeat ? repeat.repeatCount + 1 : 1,
          assignedUserId: input.assignedUserId,
          dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * (input.severity === "CRITICAL" ? 2 : 7)),
        },
      });
      const action = await tx.correctiveAction.create({
        data: {
          branchId: input.branchId,
          auditId: input.auditId,
          findingId: finding.id,
          title: `${input.title} düzeltici faaliyeti`,
          description: input.description,
          actionType: input.severity === "CRITICAL" ? "MANAGER_REVIEW" : "OTHER",
          priority: input.severity === "CRITICAL" ? "URGENT" : "HIGH",
          assignedUserId: input.assignedUserId,
          assignedById: input.createdById,
          dueAt: finding.dueAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          requiresPhoto: true,
          requiresManagerApproval: true,
        },
      });
      const task = await tx.branchTask.create({
        data: {
          branchId: input.branchId,
          title: action.title,
          description: action.description,
          assignedUserId: input.assignedUserId,
          createdById: input.createdById,
          priority: action.priority,
          status: "OPEN",
          dueDate: action.dueAt,
          requiresPhoto: true,
          requiresDescription: true,
          requiresApproval: true,
          auditId: input.auditId,
          findingId: finding.id,
          correctiveActionId: action.id,
          sourceType: "AuditFinding",
          sourceId: finding.id,
        },
      });
      await tx.correctiveAction.update({ where: { id: action.id }, data: { taskId: task.id } });
      await tx.notification.create({
        data: {
          role: "OPERATIONS_MANAGER",
          type: input.severity === "CRITICAL" ? "CRITICAL_AUDIT_FINDING" : "AUDIT_FINDING_CREATED",
          title: input.severity === "CRITICAL" ? "Kritik denetim bulgusu" : "Denetim bulgusu oluşturuldu",
          message: input.title,
          entityType: "AuditFinding",
          entityId: finding.id,
        },
      });
      return finding;
    });
  }
}

export function scoreForAnswer(value: string, maximumScore: Prisma.Decimal, criticalFailureValue?: string | null) {
  if (value === "NOT_APPLICABLE") return { score: new Prisma.Decimal(0), isPassed: true, isNotApplicable: true, isCriticalFailure: false };
  const failed = ["NO", "FAIL", "UYGUN_DEGIL"].includes(value);
  return {
    score: failed ? new Prisma.Decimal(0) : maximumScore,
    isPassed: !failed,
    isNotApplicable: false,
    isCriticalFailure: Boolean(criticalFailureValue && criticalFailureValue === value),
  };
}
