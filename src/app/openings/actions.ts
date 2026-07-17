"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission, requireUser } from "@/lib/auth";
import { DEFAULT_STAGES, isClosed } from "@/lib/openings";
import { OpeningProjectService } from "@/lib/opening-project-service";
import { prisma } from "@/lib/prisma";
import { openingSchema, stageSchema, taskSchema, type OpeningState } from "@/lib/validations/opening";

const d = (value: string | undefined | null) => (value ? new Date(value) : null);

const refresh = (id?: string, branchId?: string) => {
  revalidatePath("/openings");
  if (id) revalidatePath(`/openings/${id}`);
  if (branchId) revalidatePath(`/branches/${branchId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
};

const openingProjectSchema = z.object({
  branchId: z.string().min(1, "Şube seçin."),
  templateId: z.string().optional().or(z.literal("")),
  targetOpeningDate: z.string().min(1, "Hedef açılış tarihi zorunludur."),
  plannedStartDate: z.string().optional().or(z.literal("")),
  projectManagerId: z.string().optional().or(z.literal("")),
  operationManagerId: z.string().optional().or(z.literal("")),
  architecturalLeadId: z.string().optional().or(z.literal("")),
  openingCoordinatorId: z.string().optional().or(z.literal("")),
  plannedBudget: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

const budgetSchema = z.object({
  category: z.string().min(2, "Kategori zorunludur."),
  title: z.string().min(2, "Bütçe kalemi zorunludur."),
  plannedAmount: z.coerce.number().nonnegative(),
  approvedAmount: z.coerce.number().nonnegative().optional(),
  actualAmount: z.coerce.number().nonnegative().optional(),
  currency: z.string().default("TRY"),
  notes: z.string().optional(),
});

const riskSchema = z.object({
  title: z.string().min(2, "Risk başlığı zorunludur."),
  category: z.string().min(2, "Kategori zorunludur."),
  level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  mitigationPlan: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
});

export async function createOpening(_state: OpeningState, formData: FormData): Promise<OpeningState> {
  const parsed = openingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  const branch = await prisma.branch.findFirst({
    where: { id: parsed.data.branchId, archivedAt: null, status: { in: ["PLANNED", "SETUP", "IN_SETUP", "CONTRACTED"] } },
    include: { openings: { where: { archivedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } } } },
  });
  if (!branch) return { success: false, message: "Yalnızca planlanan veya kurulumdaki şubeler seçilebilir." };
  if (branch.openings.length) return { success: false, message: "Bu şubenin zaten aktif bir açılış projesi var." };

  try {
    const opening = await prisma.$transaction(async (tx) => {
      const created = await tx.branchOpening.create({
        data: {
          branchId: branch.id,
          title: parsed.data.title,
          plannedStartDate: d(parsed.data.plannedStartDate),
          plannedOpeningDate: new Date(parsed.data.plannedOpeningDate),
          projectManager: parsed.data.projectManager || null,
          generalNotes: parsed.data.generalNotes || null,
        },
      });
      await tx.openingStage.createMany({
        data: DEFAULT_STAGES.map((title, index) => ({
          openingId: created.id,
          stageType: title.toLocaleUpperCase("tr-TR").replaceAll(" ", "_"),
          title,
          status: index === 0 ? "IN_PROGRESS" : "NOT_STARTED",
          progressPercentage: 0,
          orderIndex: index + 1,
          plannedStartDate: index === 0 ? d(parsed.data.plannedStartDate) : null,
        })),
      });
      return created;
    });
    refresh(opening.id, branch.id);
    return { success: true, message: "Açılış projesi oluşturuldu.", id: opening.id };
  } catch (error) {
    console.error("[openings] legacy create failed", error);
    return { success: false, message: "Açılış projesi oluşturulamadı." };
  }
}

export async function createOpeningProject(_state: OpeningState, formData: FormData): Promise<OpeningState> {
  const user = await requireUser();
  await requirePermission("openings");
  const parsed = openingProjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    const project = await OpeningProjectService.createFromBranch({
      branchId: parsed.data.branchId,
      templateId: parsed.data.templateId || null,
      targetOpeningDate: new Date(parsed.data.targetOpeningDate),
      plannedStartDate: d(parsed.data.plannedStartDate),
      projectManagerId: parsed.data.projectManagerId || null,
      operationManagerId: parsed.data.operationManagerId || null,
      architecturalLeadId: parsed.data.architecturalLeadId || null,
      openingCoordinatorId: parsed.data.openingCoordinatorId || null,
      plannedBudget: parsed.data.plannedBudget || null,
      description: parsed.data.description || null,
      createdById: user.id,
    });
    refresh(project.id, project.branchId);
    return { success: true, message: "Gelişmiş açılış projesi oluşturuldu.", id: project.id };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Açılış projesi oluşturulamadı." };
  }
}

export async function ensureOpeningTemplate() {
  await requirePermission("openings");
  await OpeningProjectService.ensureDefaultTemplate();
  revalidatePath("/openings/new");
}

export async function updateStage(id: string, _state: OpeningState, formData: FormData): Promise<OpeningState> {
  const parsed = stageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Aşama bilgilerini kontrol edin." };
  const stage = await prisma.openingStage.update({
    where: { id },
    data: {
      assignedTo: parsed.data.assignedTo || null,
      plannedStartDate: d(parsed.data.plannedStartDate),
      dueDate: d(parsed.data.dueDate),
      progressPercentage: parsed.data.progressPercentage,
      delayReason: parsed.data.delayReason || null,
      status: parsed.data.progressPercentage > 0 ? "IN_PROGRESS" : undefined,
    },
  });
  await recalc(stage.openingId);
  refresh(stage.openingId);
  return { success: true, message: "Aşama güncellendi." };
}

export async function setStageStatus(id: string, status: "IN_PROGRESS" | "COMPLETED", formData: FormData) {
  void formData;
  const stage = await prisma.openingStage.findUnique({ where: { id } });
  if (!stage) return;
  await prisma.$transaction(async (tx) => {
    await tx.openingStage.update({
      where: { id },
      data: { status, progressPercentage: status === "COMPLETED" ? 100 : Math.max(1, stage.progressPercentage), completedAt: status === "COMPLETED" ? new Date() : null },
    });
    if (status === "COMPLETED") {
      await tx.openingStage.updateMany({ where: { openingId: stage.openingId, orderIndex: stage.orderIndex + 1, status: "NOT_STARTED" }, data: { status: "IN_PROGRESS", plannedStartDate: new Date() } });
    }
  });
  await recalc(stage.openingId);
  refresh(stage.openingId);
}

export async function createOpeningTask(openingId: string, _state: OpeningState, formData: FormData): Promise<OpeningState> {
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Görev bilgilerini kontrol edin." };
  await prisma.openingTask.create({ data: { ...parsed.data, description: parsed.data.description || null, assignedTo: parsed.data.assignedTo || null, dueDate: d(parsed.data.dueDate) } });
  refresh(openingId);
  return { success: true, message: "Görev eklendi." };
}

export async function setOpeningTaskStatus(openingId: string, id: string, status: string, formData: FormData) {
  void formData;
  if (!["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) return;
  await prisma.openingTask.update({ where: { id }, data: { status, completedAt: status === "COMPLETED" ? new Date() : null } });
  refresh(openingId);
}

export async function completeOpening(id: string, formData: FormData) {
  void formData;
  const opening = await prisma.branchOpening.findUnique({ where: { id } });
  if (!opening || isClosed(opening.status)) return;
  await prisma.$transaction([
    prisma.branchOpening.update({ where: { id }, data: { status: "COMPLETED", progressPercentage: 100, actualOpeningDate: new Date(), generalNotes: `${opening.generalNotes ?? ""}\n${new Date().toLocaleString("tr-TR")}: Şube açılışı tamamlandı.`.trim() } }),
    prisma.branch.update({ where: { id: opening.branchId }, data: { status: "ACTIVE", openingDate: new Date() } }),
    prisma.openingStage.updateMany({ where: { openingId: id, status: { notIn: ["COMPLETED", "CANCELLED"] } }, data: { status: "COMPLETED", progressPercentage: 100, completedAt: new Date() } }),
  ]);
  refresh(id, opening.branchId);
}

export async function setProjectStageStatus(stageId: string, status: "IN_PROGRESS" | "COMPLETED") {
  const user = await requireUser();
  await requirePermission("openings");
  const stage = await prisma.openingProjectStage.update({
    where: { id: stageId },
    data: {
      status,
      actualStartDate: status === "IN_PROGRESS" ? new Date() : undefined,
      actualEndDate: status === "COMPLETED" ? new Date() : undefined,
      progressPercentage: status === "COMPLETED" ? 100 : 10,
    },
    include: { project: true },
  });
  await prisma.branchTimelineEvent.create({
    data: {
      branchId: stage.project.branchId,
      userId: user.id,
      action: status === "COMPLETED" ? "OPENING_STAGE_COMPLETED" : "OPENING_STAGE_STARTED",
      entityType: "OpeningProjectStage",
      entityId: stage.id,
      description: `${stage.nameSnapshot} aşaması ${status === "COMPLETED" ? "tamamlandı" : "başlatıldı"}.`,
    },
  });
  await OpeningProjectService.recalculateProject(stage.projectId);
  refresh(stage.projectId, stage.project.branchId);
}

export async function completeProjectMilestone(milestoneId: string, formData: FormData) {
  const user = await requireUser();
  await requirePermission("openings");
  const note = String(formData.get("note") || "");
  const milestone = await prisma.openingMilestone.findUnique({ where: { id: milestoneId }, select: { projectId: true, project: { select: { branchId: true } } } });
  if (!milestone) return;
  await OpeningProjectService.completeMilestone(milestoneId, user.id, note);
  refresh(milestone.projectId, milestone.project.branchId);
}

export async function addOpeningBudgetItem(projectId: string, _state: OpeningState, formData: FormData): Promise<OpeningState> {
  const user = await requireUser();
  await requirePermission("openings");
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Bütçe formunu kontrol edin." };
  await prisma.openingBudgetItem.create({
    data: {
      projectId,
      category: parsed.data.category,
      title: parsed.data.title,
      plannedAmount: parsed.data.plannedAmount,
      approvedAmount: parsed.data.approvedAmount,
      actualAmount: parsed.data.actualAmount,
      currency: parsed.data.currency,
      notes: parsed.data.notes || null,
      createdById: user.id,
    },
  });
  await OpeningProjectService.recalculateProject(projectId);
  refresh(projectId);
  return { success: true, message: "Bütçe kalemi eklendi." };
}

export async function addOpeningRisk(projectId: string, _state: OpeningState, formData: FormData): Promise<OpeningState> {
  const user = await requireUser();
  await requirePermission("openings");
  const parsed = riskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Risk formunu kontrol edin." };
  await prisma.openingRisk.create({
    data: {
      projectId,
      title: parsed.data.title,
      category: parsed.data.category,
      level: parsed.data.level,
      mitigationPlan: parsed.data.mitigationPlan || null,
      dueDate: d(parsed.data.dueDate),
      createdById: user.id,
    },
  });
  await OpeningProjectService.recalculateProject(projectId);
  refresh(projectId);
  return { success: true, message: "Risk kaydı oluşturuldu." };
}

export async function updateReadinessCheck(checkId: string, formData: FormData) {
  const user = await requireUser();
  await requirePermission("openings");
  const status = String(formData.get("status") || "PENDING");
  const score = Number(formData.get("score") || 0);
  const notes = String(formData.get("notes") || "");
  const check = await prisma.openingReadinessCheck.update({
    where: { id: checkId },
    data: { status, score: Math.max(0, Math.min(100, score)), notes: notes || null, checkedById: user.id, checkedAt: new Date() },
  });
  await OpeningProjectService.recalculateProject(check.projectId);
  refresh(check.projectId);
}

export async function changeOpeningTargetDate(projectId: string, _state: OpeningState, formData: FormData): Promise<OpeningState> {
  const user = await requireUser();
  await requirePermission("openings");
  const newDate = String(formData.get("newDate") || "");
  const reason = String(formData.get("reason") || "");
  if (!newDate || !reason) return { success: false, message: "Yeni tarih ve değişiklik nedeni zorunludur." };
  await OpeningProjectService.changeTargetDate(projectId, new Date(newDate), reason, user.id);
  refresh(projectId);
  return { success: true, message: "Hedef açılış tarihi güncellendi ve geçmişe işlendi." };
}

export async function markProjectOpened(projectId: string, formData: FormData) {
  void formData;
  const user = await requireUser();
  await requirePermission("openings");
  const project = await prisma.openingProject.findUnique({ where: { id: projectId }, select: { branchId: true } });
  if (!project) return;
  await OpeningProjectService.markOpened(projectId, user.id);
  refresh(projectId, project.branchId);
}

async function recalc(id: string) {
  const stages = await prisma.openingStage.findMany({ where: { openingId: id }, select: { progressPercentage: true } });
  const progress = stages.length ? Math.round(stages.reduce((sum, stage) => sum + stage.progressPercentage, 0) / stages.length) : 0;
  await prisma.branchOpening.update({ where: { id }, data: { progressPercentage: progress } });
}
