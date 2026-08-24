"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth";
import { BranchHealthScoreService } from "@/lib/operations/health-score-service";
import { prisma } from "@/lib/prisma";

const visitScoreSchema = z.preprocess(
  (value) => (value === "" || value == null ? undefined : Number(value)),
  z.number().int().min(0, "Ziyaret puanı en az 0 olmalıdır.").max(100, "Ziyaret puanı en fazla 100 olabilir.").optional(),
);

const createVisitSchema = z.object({
  branchId: z.string().min(1, "Şube seçimi zorunludur."),
  plannedAt: z.string().min(1, "Planlanan ziyaret tarihi zorunludur."),
  visitorName: z.string().trim().optional(),
  visitType: z.string().trim().optional(),
  title: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  visitScore: visitScoreSchema,
  status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).optional(),
});

const updateVisitSchema = createVisitSchema.extend({
  status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]),
});

const completeVisitSchema = z.object({
  completedAt: z.string().optional(),
  resultNotes: z.string().trim().optional(),
  visitScore: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().int().min(0, "Ziyaret puanı en az 0 olmalıdır.").max(100, "Ziyaret puanı en fazla 100 olabilir."),
  ),
});

const cancelVisitSchema = z.object({
  cancellationReason: z.string().trim().min(2, "İptal nedeni yazın."),
});

const noteVisitSchema = z.object({
  note: z.string().trim().min(2, "Not yazın."),
});

function refresh(branchId?: string) {
  revalidatePath("/branches");
  revalidatePath("/branches/visits");
  revalidatePath("/branch-visits");
  revalidatePath("/operations");
  if (branchId) revalidatePath(`/branches/${branchId}`);
}

export async function createBranchVisit(formData: FormData) {
  const user = await requirePermission("branches");
  const parsed = createVisitSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

  const data = parsed.data;
  const plannedAt = new Date(data.plannedAt);
  if (Number.isNaN(plannedAt.getTime())) return;

  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, archivedAt: null },
    select: { id: true, branchName: true },
  });

  if (!branch) return;

  const title = data.title || `${branch.branchName} operasyon ziyareti`;
  const visitType = data.visitType || "OPERATION";
  const status = data.status || "PLANNED";

  await prisma.$transaction(async (tx) => {
    const visit = await tx.branchVisit.create({
      data: {
        branchId: branch.id,
        title,
        visitType,
        plannedAt,
        status,
        visitorName: data.visitorName || user.name,
        plannedById: user.id,
        completedAt: status === "COMPLETED" ? plannedAt : null,
        completedById: status === "COMPLETED" ? user.id : null,
        visitScore: status === "COMPLETED" ? data.visitScore ?? null : null,
        resultNotes: status === "CANCELLED" ? "İptal edildi." : null,
        notes: data.notes || null,
      },
    });

    await tx.operationCalendarItem.create({
      data: {
        branchId: branch.id,
        title,
        description: data.notes || "Operasyon ziyareti planlandı.",
        eventType: "BRANCH_VISIT",
        startAt: plannedAt,
        status,
        taskId: visit.id,
        createdById: user.id,
      },
    });

    await tx.branchTimelineEvent.create({
      data: {
        branchId: branch.id,
        userId: user.id,
        action: "BRANCH_VISIT_PLANNED",
        entityType: "BranchVisit",
        entityId: visit.id,
        description: `${branch.branchName} için merkez operasyon ziyareti planlandı.`,
      },
    });
  });

  refresh(branch.id);
  if (status === "COMPLETED") await new BranchHealthScoreService().calculate(branch.id);
}

export async function updateBranchVisit(visitId: string, formData: FormData) {
  const user = await requirePermission("branches");
  const parsed = updateVisitSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

  const data = parsed.data;
  const plannedAt = new Date(data.plannedAt);
  if (Number.isNaN(plannedAt.getTime())) return;

  const [visit, branch] = await Promise.all([
    prisma.branchVisit.findUnique({
      where: { id: visitId },
      select: { id: true, branchId: true, completedAt: true, completedById: true },
    }),
    prisma.branch.findFirst({
      where: { id: data.branchId, archivedAt: null },
      select: { id: true, branchName: true },
    }),
  ]);

  if (!visit || !branch) return;

  const title = data.title || `${branch.branchName} operasyon ziyareti`;
  const resultNotes = data.status === "CANCELLED" ? "İptal edildi." : undefined;

  await prisma.$transaction([
    prisma.branchVisit.update({
      where: { id: visit.id },
      data: {
        branchId: branch.id,
        title,
        visitType: data.visitType || "OPERATION",
        plannedAt,
        status: data.status,
        visitorName: data.visitorName || user.name,
        completedAt: data.status === "COMPLETED" ? visit.completedAt ?? plannedAt : visit.completedAt,
        completedById: data.status === "COMPLETED" ? visit.completedById ?? user.id : visit.completedById,
        visitScore: data.status === "COMPLETED" ? data.visitScore ?? null : null,
        ...(resultNotes ? { resultNotes } : {}),
        notes: data.notes || null,
      },
    }),
    prisma.operationCalendarItem.updateMany({
      where: { taskId: visit.id },
      data: {
        branchId: branch.id,
        title,
        description: data.notes || "Operasyon ziyareti güncellendi.",
        startAt: plannedAt,
        status: data.status,
      },
    }),
    prisma.branchTimelineEvent.create({
      data: {
        branchId: branch.id,
        userId: user.id,
        action: "BRANCH_VISIT_UPDATED",
        entityType: "BranchVisit",
        entityId: visit.id,
        description: `${branch.branchName} operasyon ziyareti güncellendi.`,
      },
    }),
  ]);

  refresh(branch.id);
  if (visit.branchId !== branch.id) refresh(visit.branchId);
  if (data.status === "COMPLETED") await new BranchHealthScoreService().calculate(branch.id);
}

export async function completeBranchVisit(visitId: string, formData: FormData) {
  const user = await requirePermission("branches");
  const parsed = completeVisitSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

  const visit = await prisma.branchVisit.findUnique({
    where: { id: visitId },
    include: { branch: { select: { id: true, branchName: true } } },
  });

  if (!visit || visit.status === "COMPLETED") return;

  const completedAt = parsed.data.completedAt ? new Date(parsed.data.completedAt) : new Date();
  if (Number.isNaN(completedAt.getTime())) return;

  await prisma.$transaction([
    prisma.branchVisit.update({
      where: { id: visit.id },
      data: {
        status: "COMPLETED",
        completedAt,
        completedById: user.id,
        visitScore: parsed.data.visitScore,
        resultNotes: parsed.data.resultNotes || null,
      },
    }),
    prisma.operationCalendarItem.updateMany({
      where: { branchId: visit.branchId, taskId: visit.id },
      data: {
        status: "COMPLETED",
        description: parsed.data.resultNotes || visit.notes || "Operasyon ziyareti gerçekleşti.",
      },
    }),
    prisma.branchTimelineEvent.create({
      data: {
        branchId: visit.branchId,
        userId: user.id,
        action: "BRANCH_VISIT_COMPLETED",
        entityType: "BranchVisit",
        entityId: visit.id,
        description: `${visit.branch.branchName} merkez operasyon ziyareti gerçekleşti olarak işaretlendi.`,
      },
    }),
  ]);

  refresh(visit.branchId);
  await new BranchHealthScoreService().calculate(visit.branchId);
}

export async function cancelBranchVisit(visitId: string, formData: FormData) {
  const user = await requirePermission("branches");
  const parsed = cancelVisitSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

  const visit = await prisma.branchVisit.findUnique({
    where: { id: visitId },
    include: { branch: { select: { id: true, branchName: true } } },
  });

  if (!visit || visit.status !== "PLANNED") return;

  const reason = parsed.data.cancellationReason;
  const description = `İptal nedeni: ${reason}`;

  await prisma.$transaction([
    prisma.branchVisit.update({
      where: { id: visit.id },
      data: {
        status: "CANCELLED",
        resultNotes: description,
      },
    }),
    prisma.operationCalendarItem.updateMany({
      where: { branchId: visit.branchId, taskId: visit.id },
      data: {
        status: "CANCELLED",
        description,
      },
    }),
    prisma.branchTimelineEvent.create({
      data: {
        branchId: visit.branchId,
        userId: user.id,
        action: "BRANCH_VISIT_CANCELLED",
        entityType: "BranchVisit",
        entityId: visit.id,
        description: `${visit.branch.branchName} merkez operasyon ziyareti iptal edildi. ${description}`,
      },
    }),
  ]);

  refresh(visit.branchId);
}

export async function addBranchVisitNote(visitId: string, formData: FormData) {
  const user = await requirePermission("branches");
  const parsed = noteVisitSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

  const visit = await prisma.branchVisit.findUnique({
    where: { id: visitId },
    include: { branch: { select: { id: true, branchName: true } } },
  });

  if (!visit) return;

  const note = `${new Date().toLocaleString("tr-TR")} - ${user.name}: ${parsed.data.note}`;
  const resultNotes = [visit.resultNotes, note].filter(Boolean).join("\n");

  await prisma.$transaction([
    prisma.branchVisit.update({
      where: { id: visit.id },
      data: { resultNotes },
    }),
    prisma.operationCalendarItem.updateMany({
      where: { branchId: visit.branchId, taskId: visit.id },
      data: { description: resultNotes },
    }),
    prisma.branchTimelineEvent.create({
      data: {
        branchId: visit.branchId,
        userId: user.id,
        action: "BRANCH_VISIT_NOTE_ADDED",
        entityType: "BranchVisit",
        entityId: visit.id,
        description: `${visit.branch.branchName} operasyon ziyaretine not eklendi.`,
      },
    }),
  ]);

  refresh(visit.branchId);
}
