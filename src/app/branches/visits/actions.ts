"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createVisitSchema = z.object({
  branchId: z.string().min(1, "Şube seçimi zorunludur."),
  plannedAt: z.string().min(1, "Planlanan ziyaret tarihi zorunludur."),
  visitorName: z.string().trim().optional(),
  visitType: z.string().trim().optional(),
  title: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const completeVisitSchema = z.object({
  completedAt: z.string().optional(),
  resultNotes: z.string().trim().optional(),
});

function refresh(branchId?: string) {
  revalidatePath("/branches");
  revalidatePath("/branches/visits");
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

  await prisma.$transaction(async (tx) => {
    const visit = await tx.branchVisit.create({
      data: {
        branchId: branch.id,
        title,
        visitType,
        plannedAt,
        visitorName: data.visitorName || user.name,
        plannedById: user.id,
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
        status: "PLANNED",
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
}
