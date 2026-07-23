import { Prisma, type OpeningProjectStatus, type OpeningRiskLevel, type PrismaClient } from "@prisma/client";

import { defaultMilestonesByStage, defaultOpeningTemplateStages } from "@/lib/openings";
import { prisma } from "@/lib/prisma";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export const activeProjectStatuses: OpeningProjectStatus[] = [
  "DRAFT",
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "AT_RISK",
  "DELAYED",
  "READY_FOR_REVIEW",
  "READY_FOR_OPENING",
  "OPENED",
  "POST_OPENING",
];

export class OpeningProjectService {
  static async ensureDefaultTemplate(tx: Tx = prisma) {
    const existing = await tx.openingProjectTemplate.findFirst({
      where: { code: "DEFAULT_OPENING", status: "PUBLISHED", archivedAt: null },
      include: { stages: { include: { milestones: { include: { tasks: true } } } } },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    return tx.openingProjectTemplate.create({
      data: {
        name: "Iceberry Standart Açılış Şablonu",
        code: "DEFAULT_OPENING",
        description: "Sözleşmeden 90 günlük açılış sonrası takibe kadar standart Iceberry şube açılış akışı.",
        version: 1,
        status: "PUBLISHED",
        branchConcept: "MULTI_CONCEPT",
        estimatedDurationDays: 90,
        isDefault: true,
        publishedAt: new Date(),
        stages: {
          create: defaultOpeningTemplateStages.map(([code, name], index) => ({
            name,
            code,
            sortOrder: index + 1,
            estimatedDurationDays: code === "POST_OPENING" ? 90 : 7,
            weight: code === "POST_OPENING" ? 1 : 2,
            milestones: {
              create: (defaultMilestonesByStage[code] || []).map((milestone, milestoneIndex) => ({
                name: milestone.name,
                code: milestone.code,
                sortOrder: milestoneIndex + 1,
                estimatedDurationDays: code === "POST_OPENING" ? 90 : 3,
                priority: milestone.critical ? "HIGH" : "NORMAL",
                isRequired: true,
                isCritical: Boolean(milestone.critical),
                requiresApproval: Boolean(milestone.approval),
                requiresDocument: Boolean(milestone.document),
                requiresAudit: Boolean(milestone.audit),
                tasks: {
                  create: milestone.tasks.map((title, taskIndex) => ({
                    title,
                    priority: milestone.critical ? "HIGH" : "NORMAL",
                    dueOffsetDays: taskIndex + 1,
                    requiresApproval: Boolean(milestone.approval),
                    requiresDocument: Boolean(milestone.document),
                    autoCreate: true,
                    sortOrder: taskIndex + 1,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: { stages: { include: { milestones: { include: { tasks: true } } }, orderBy: { sortOrder: "asc" } } },
    });
  }

  static async generateProjectNumber(tx: Tx = prisma) {
    const year = new Date().getFullYear();
    const prefix = `IB-OPEN-${year}-`;
    const count = await tx.openingProject.count({
      where: { projectNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, "0")}`;
  }

  static async createFromBranch(input: {
    branchId: string;
    templateId?: string | null;
    targetOpeningDate: Date;
    plannedStartDate?: Date | null;
    projectManagerId?: string | null;
    operationManagerId?: string | null;
    architecturalLeadId?: string | null;
    openingCoordinatorId?: string | null;
    plannedBudget?: Prisma.Decimal | number | string | null;
    description?: string | null;
    createdById?: string | null;
  }) {
    return prisma.$transaction((tx) => OpeningProjectService.createFromBranchInTransaction(tx, input));
  }

  static async createFromBranchInTransaction(tx: Tx, input: {
    branchId: string;
    templateId?: string | null;
    targetOpeningDate: Date;
    plannedStartDate?: Date | null;
    projectManagerId?: string | null;
    operationManagerId?: string | null;
    architecturalLeadId?: string | null;
    openingCoordinatorId?: string | null;
    plannedBudget?: Prisma.Decimal | number | string | null;
    description?: string | null;
    createdById?: string | null;
  }) {
      const branch = await tx.branch.findFirst({
        where: { id: input.branchId, archivedAt: null },
        include: {
          candidate: true,
          franchisee: true,
          openingProjects: { where: { archivedAt: null, status: { in: activeProjectStatuses } }, select: { id: true } },
        },
      });
      if (!branch) throw new Error("Şube bulunamadı.");
      if (branch.openingProjects.length) throw new Error("Bu şube için aktif açılış projesi zaten var.");

      const template = input.templateId
        ? await tx.openingProjectTemplate.findFirst({
            where: { id: input.templateId, status: "PUBLISHED", archivedAt: null },
            include: { stages: { include: { milestones: { include: { tasks: true } } }, orderBy: { sortOrder: "asc" } } },
          })
        : await OpeningProjectService.ensureDefaultTemplate(tx);
      if (!template) throw new Error("Yayımlanmış açılış şablonu bulunamadı.");

      const projectNumber = await OpeningProjectService.generateProjectNumber(tx);
      const project = await tx.openingProject.create({
        data: {
          projectNumber,
          name: `${branch.branchName} Açılış Projesi`,
          branchId: branch.id,
          franchiseCandidateId: branch.candidateId,
          templateId: template.id,
          templateVersion: template.version,
          branchConcept: branch.concept || branch.conceptType,
          ownershipType: branch.ownershipType,
          country: branch.country,
          city: branch.city,
          district: branch.district,
          address: branch.address,
          shoppingMallName: branch.mallName,
          investorName: branch.franchisee?.contactName || branch.candidate?.fullName || branch.authorizedPersonName,
          investorCompanyName: branch.franchisee?.companyName || branch.legalName,
          projectManagerId: input.projectManagerId,
          operationManagerId: input.operationManagerId,
          architecturalLeadId: input.architecturalLeadId,
          openingCoordinatorId: input.openingCoordinatorId,
          plannedStartDate: input.plannedStartDate,
          targetOpeningDate: input.targetOpeningDate,
          forecastOpeningDate: input.targetOpeningDate,
          plannedBudget: input.plannedBudget ? new Prisma.Decimal(input.plannedBudget) : null,
          description: input.description,
          createdById: input.createdById,
        },
      });

      let dayCursor = new Date(input.plannedStartDate || new Date());
      for (const stageTemplate of template.stages) {
        const plannedStart = new Date(dayCursor);
        const plannedEnd = addDays(plannedStart, stageTemplate.estimatedDurationDays);
        const stage = await tx.openingProjectStage.create({
          data: {
            projectId: project.id,
            stageTemplateId: stageTemplate.id,
            nameSnapshot: stageTemplate.name,
            codeSnapshot: stageTemplate.code,
            descriptionSnapshot: stageTemplate.description,
            sortOrder: stageTemplate.sortOrder,
            weight: stageTemplate.weight,
            plannedStartDate: plannedStart,
            plannedEndDate: plannedEnd,
            status: stageTemplate.sortOrder === 1 ? "READY_TO_START" : "NOT_STARTED",
          },
        });

        for (const milestoneTemplate of stageTemplate.milestones) {
          const milestone = await tx.openingMilestone.create({
            data: {
              projectId: project.id,
              projectStageId: stage.id,
              milestoneTemplateId: milestoneTemplate.id,
              nameSnapshot: milestoneTemplate.name,
              codeSnapshot: milestoneTemplate.code,
              descriptionSnapshot: milestoneTemplate.description,
              priority: milestoneTemplate.priority,
              isRequired: milestoneTemplate.isRequired,
              isCritical: milestoneTemplate.isCritical,
              plannedStartDate: plannedStart,
              dueDate: addDays(plannedStart, milestoneTemplate.estimatedDurationDays),
              requiresApproval: milestoneTemplate.requiresApproval,
              requiresEvidence: milestoneTemplate.requiresEvidence,
              requiresDocument: milestoneTemplate.requiresDocument,
              requiresAudit: milestoneTemplate.requiresAudit,
              status: stageTemplate.sortOrder === 1 ? "READY_TO_START" : "PENDING",
            },
          });

          for (const taskTemplate of milestoneTemplate.tasks.filter((task) => task.autoCreate)) {
            const task = await tx.branchTask.create({
              data: {
                branchId: branch.id,
                title: taskTemplate.title,
                description: taskTemplate.description || `${milestone.nameSnapshot} kilometre taşı kapsamında otomatik oluşturuldu.`,
                assignedRole: taskTemplate.defaultOwnerRole || milestoneTemplate.defaultOwnerRole,
                createdById: input.createdById,
                priority: taskTemplate.priority,
                status: "OPEN",
                dueDate: addDays(plannedStart, taskTemplate.dueOffsetDays),
                requiresFile: taskTemplate.requiresDocument,
                requiresApproval: taskTemplate.requiresApproval,
                sourceType: "OPENING_PROJECT",
                sourceId: project.id,
                openingProjectId: project.id,
                openingStageId: stage.id,
                openingMilestoneId: milestone.id,
              },
            });
            await tx.openingMilestone.update({ where: { id: milestone.id }, data: { relatedTaskId: task.id } });
          }
        }
        dayCursor = addDays(plannedEnd, 1);
      }

      await tx.branch.update({
        where: { id: branch.id },
        data: { status: branch.status === "ACTIVE" ? "ACTIVE" : "IN_SETUP", plannedOpeningDate: input.targetOpeningDate },
      });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: branch.id,
          userId: input.createdById,
          action: "OPENING_PROJECT_CREATED",
          entityType: "OpeningProject",
          entityId: project.id,
          description: `${project.projectNumber} numaralı açılış projesi oluşturuldu.`,
        },
      });
      await tx.notification.create({
        data: {
          userId: input.projectManagerId || null,
          role: input.projectManagerId ? null : "OPERATIONS_MANAGER",
          type: "OPENING_PROJECT_CREATED",
          title: "Yeni açılış projesi",
          message: `${branch.branchName} için açılış projesi oluşturuldu.`,
          entityType: "OpeningProject",
          entityId: project.id,
        },
      });

      await OpeningProjectService.seedReadinessChecks(tx, project.id);
      return OpeningProjectService.recalculateProject(project.id, tx);
  }

  static async seedReadinessChecks(tx: Tx, projectId: string) {
    const checks = [
      ["ARCHITECTURE", "Mimari onay alındı mı?"],
      ["PERMIT", "Ruhsat ve resmî izinler uygun mu?"],
      ["CONSTRUCTION", "İnşaat ve tadilat tamamlandı mı?"],
      ["EQUIPMENT", "Ekipman kurulumu tamamlandı mı?"],
      ["STOCK", "İlk stok teslim edildi mi?"],
      ["TRAINING", "Personel eğitimi tamamlandı mı?"],
      ["SYSTEMS", "POS, internet, Ticimax ve Paraşüt hazırlığı tamam mı?"],
      ["MARKETING", "Açılış pazarlaması hazır mı?"],
      ["AUDIT", "Açılış öncesi denetim başarılı mı?"],
      ["MANAGEMENT_APPROVAL", "Yönetici açılış onayı verildi mi?"],
    ];
    await tx.openingReadinessCheck.createMany({
      data: checks.map(([component, title]) => ({
        projectId,
        component,
        title,
        blocker: ["PERMIT", "AUDIT", "MANAGEMENT_APPROVAL"].includes(component),
      })),
      skipDuplicates: true,
    });
  }

  static async recalculateProject(projectId: string, tx: Tx = prisma) {
    const [stages, milestones, risks, budgetItems, checks] = await Promise.all([
      tx.openingProjectStage.findMany({ where: { projectId } }),
      tx.openingMilestone.findMany({ where: { projectId } }),
      tx.openingRisk.findMany({ where: { projectId, status: { in: ["OPEN", "WATCHING"] } } }),
      tx.openingBudgetItem.findMany({ where: { projectId } }),
      tx.openingReadinessCheck.findMany({ where: { projectId } }),
    ]);
    const progress = stages.length
      ? Math.round(stages.reduce((sum, stage) => sum + stage.progressPercentage * stage.weight, 0) / Math.max(1, stages.reduce((sum, stage) => sum + stage.weight, 0)))
      : 0;
    const now = new Date();
    const overdueMilestones = milestones.filter((item) => item.dueDate && item.dueDate < now && !["COMPLETED", "CANCELLED", "SKIPPED"].includes(item.status)).length;
    const criticalRisk = risks.some((risk) => risk.level === "CRITICAL");
    const highRisk = risks.some((risk) => risk.level === "HIGH") || overdueMilestones > 0;
    const riskLevel: OpeningRiskLevel = criticalRisk ? "CRITICAL" : highRisk ? "HIGH" : overdueMilestones ? "MEDIUM" : "LOW";
    const plannedBudget = budgetItems.reduce((sum, item) => sum.add(item.plannedAmount), new Prisma.Decimal(0));
    const actualCost = budgetItems.reduce((sum, item) => sum.add(item.actualAmount || 0), new Prisma.Decimal(0));
    const readiness = checks.length ? Math.round(checks.reduce((sum, check) => sum + check.score, 0) / checks.length) : 0;
    const status: OpeningProjectStatus | undefined = riskLevel === "HIGH" || riskLevel === "CRITICAL" ? "AT_RISK" : progress > 0 ? "IN_PROGRESS" : undefined;

    return tx.openingProject.update({
      where: { id: projectId },
      data: {
        progressPercentage: progress,
        riskLevel,
        openingReadinessScore: readiness,
        plannedBudget,
        actualCost,
        budgetVariance: actualCost.sub(plannedBudget),
        status,
      },
    });
  }

  static async canApproveOpening(projectId: string, tx: Tx = prisma) {
    const [milestones, checks, criticalRisks] = await Promise.all([
      tx.openingMilestone.findMany({ where: { projectId, isCritical: true } }),
      tx.openingReadinessCheck.findMany({ where: { projectId, blocker: true } }),
      tx.openingRisk.count({ where: { projectId, level: "CRITICAL", status: { in: ["OPEN", "WATCHING"] } } }),
    ]);
    const blockingMilestone = milestones.find((milestone) => milestone.status !== "COMPLETED");
    const blockingCheck = checks.find((check) => check.status !== "PASSED");
    if (blockingMilestone) return { ok: false, reason: `${blockingMilestone.nameSnapshot} tamamlanmadan açılış onayı verilemez.` };
    if (blockingCheck) return { ok: false, reason: `${blockingCheck.title} tamamlanmadan açılış onayı verilemez.` };
    if (criticalRisks) return { ok: false, reason: "Açık kritik risk varken açılış onayı verilemez." };
    return { ok: true, reason: "Açılış kriterleri sağlandı." };
  }

  static async completeMilestone(milestoneId: string, userId?: string | null, note?: string | null) {
    const milestone = await prisma.openingMilestone.findUnique({ where: { id: milestoneId }, include: { project: true } });
    if (!milestone) throw new Error("Kilometre taşı bulunamadı.");
    await prisma.$transaction(async (tx) => {
      await tx.openingMilestone.update({
        where: { id: milestoneId },
        data: {
          status: milestone.requiresApproval ? "WAITING_APPROVAL" : "COMPLETED",
          progressPercentage: milestone.requiresApproval ? 90 : 100,
          completedAt: milestone.requiresApproval ? null : new Date(),
          completionNote: note,
          approvedById: milestone.requiresApproval ? undefined : userId,
          approvedAt: milestone.requiresApproval ? undefined : new Date(),
        },
      });
      if (milestone.relatedTaskId) {
        await tx.branchTask.update({ where: { id: milestone.relatedTaskId }, data: { status: "COMPLETED", completedAt: new Date(), progress: 100, completionNote: note } }).catch(() => undefined);
      }
      await tx.branchTimelineEvent.create({
        data: {
          branchId: milestone.project.branchId,
          userId,
          action: "OPENING_MILESTONE_COMPLETED",
          entityType: "OpeningMilestone",
          entityId: milestone.id,
          description: `${milestone.nameSnapshot} kilometre taşı tamamlandı.`,
        },
      });
      await OpeningProjectService.recalculateProject(milestone.projectId, tx);
    });
  }

  static async changeTargetDate(projectId: string, newDate: Date, reason: string, userId?: string | null) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.openingProject.findUnique({ where: { id: projectId }, include: { stages: true } });
      if (!project) throw new Error("Açılış projesi bulunamadı.");
      await tx.openingTargetDateChange.create({
        data: {
          projectId,
          oldDate: project.targetOpeningDate,
          newDate,
          reason,
          changedById: userId,
          affectedSummary: `${project.stages.length} aşama hedef tarih değişikliğinden etkilenebilir.`,
        },
      });
      return tx.openingProject.update({ where: { id: projectId }, data: { targetOpeningDate: newDate, forecastOpeningDate: newDate } });
    });
  }

  static async markOpened(projectId: string, userId?: string | null) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.openingProject.findUnique({ where: { id: projectId } });
      if (!project) throw new Error("Açılış projesi bulunamadı.");
      const approval = await OpeningProjectService.canApproveOpening(projectId, tx);
      if (!approval.ok) throw new Error(approval.reason);
      const openedAt = new Date();
      await tx.openingProject.update({ where: { id: projectId }, data: { status: "OPENED", actualOpeningDate: openedAt, progressPercentage: 100 } });
      await tx.branch.update({ where: { id: project.branchId }, data: { status: "ACTIVE", openingDate: openedAt } });
      await tx.openingPostOpeningReview.createMany({
        data: [7, 30, 60, 90].map((dayNumber) => ({
          projectId,
          dayNumber,
          plannedDate: addDays(openedAt, dayNumber),
        })),
        skipDuplicates: true,
      });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: project.branchId,
          userId,
          action: "BRANCH_OPENED",
          entityType: "OpeningProject",
          entityId: projectId,
          description: "Şube gerçek açılış tarihi ile aktif duruma alındı.",
        },
      });
    });
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
