"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit, requirePermission, requireUser } from "@/lib/auth";
import { allowedEvidenceMimeTypes, evidenceTypeForMime, maxEvidenceFileSize } from "@/lib/branch-tasks";
import { canAccessBranch } from "@/lib/branch-access";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export type BranchTaskState = { success: boolean; message: string };

const taskSchema = z.object({
  branchId: z.string().min(1),
  title: z.string().trim().min(2, "Görev başlığı zorunludur."),
  description: z.string().trim().optional(),
  assignedUserId: z.string().optional(),
  assignedRole: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  requiresPhoto: z.string().optional(),
  requiresVideo: z.string().optional(),
  requiresFile: z.string().optional(),
  requiresDescription: z.string().optional(),
  requiresResultNote: z.string().optional(),
  minimumPhotoCount: z.string().optional(),
  minimumVideoCount: z.string().optional(),
  minimumFileCount: z.string().optional(),
  requiresApproval: z.string().optional(),
});

function refresh(branchId?: string) {
  revalidatePath("/tasks");
  revalidatePath("/branch-portal");
  revalidatePath("/branches");
  if (branchId) revalidatePath(`/branches/${branchId}`);
}

const bool = (value?: string) => value === "on" || value === "1";
const count = (value?: string) => Math.max(0, Number(value || 0));

export async function createBranchTask(_: BranchTaskState, formData: FormData): Promise<BranchTaskState> {
  const user = await requirePermission("tasks");
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  if (!(await canAccessBranch(parsed.data.branchId))) return { success: false, message: "Bu şubeye görev oluşturma yetkiniz yok." };

  try {
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.branchTask.create({
        data: {
          branchId: parsed.data.branchId,
          title: parsed.data.title,
          description: parsed.data.description || null,
          assignedUserId: parsed.data.assignedUserId || null,
          assignedRole: parsed.data.assignedRole || null,
          createdById: user.id,
          priority: parsed.data.priority,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          requiresPhoto: bool(parsed.data.requiresPhoto),
          requiresVideo: bool(parsed.data.requiresVideo),
          requiresFile: bool(parsed.data.requiresFile),
          requiresDescription: bool(parsed.data.requiresDescription),
          requiresResultNote: bool(parsed.data.requiresResultNote),
          minimumPhotoCount: count(parsed.data.minimumPhotoCount),
          minimumVideoCount: count(parsed.data.minimumVideoCount),
          minimumFileCount: count(parsed.data.minimumFileCount),
          requiresApproval: parsed.data.requiresApproval !== "off",
        },
      });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: parsed.data.branchId,
          userId: user.id,
          action: "TASK_CREATED",
          entityType: "BranchTask",
          entityId: created.id,
          description: `${created.title} görevi oluşturuldu.`,
        },
      });
      return created;
    });
    await audit("TASK_CREATED", "BranchTask", task.id, "Şube görevi oluşturuldu.", user.id);
    refresh(task.branchId);

    return { success: true, message: "Görev oluşturuldu." };
  } catch {
    return { success: false, message: "Görev oluşturulamadı." };
  }
}

export async function uploadTaskEvidence(taskId: string, _: BranchTaskState, formData: FormData): Promise<BranchTaskState> {
  const user = await requireUser();
  const task = await prisma.branchTask.findUnique({ where: { id: taskId }, select: { id: true, branchId: true, status: true } });
  if (!task) return { success: false, message: "Görev bulunamadı." };
  if (!(await canAccessBranch(task.branchId))) return { success: false, message: "Bu göreve kanıt yükleme yetkiniz yok." };
  if (["APPROVED", "COMPLETED", "CANCELLED"].includes(task.status)) return { success: false, message: "Bu görev artık kanıt kabul etmiyor." };

  const description = String(formData.get("description") ?? "");
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length && !description.trim()) return { success: false, message: "En az bir dosya veya açıklama ekleyin." };
  if (files.some((file) => !allowedEvidenceMimeTypes.includes(file.type as typeof allowedEvidenceMimeTypes[number]))) return { success: false, message: "Desteklenmeyen dosya türü." };
  if (files.some((file) => file.size > maxEvidenceFileSize)) return { success: false, message: "Her kanıt dosyası en fazla 50 MB olabilir." };

  const stored: { file: File; fileName: string; filePath: string }[] = [];
  try {
    for (const file of files) {
      const saved = await storage.save(file);
      stored.push({ file, ...saved });
    }
    await prisma.$transaction(async (tx) => {
      if (description.trim()) {
        await tx.taskEvidence.create({
          data: { taskId, evidenceType: "TEXT", description: description.trim(), uploadedById: user.id },
        });
      }
      for (const item of stored) {
        await tx.taskEvidence.create({
          data: {
            taskId,
            evidenceType: evidenceTypeForMime(item.file.type),
            fileName: path.basename(item.file.name),
            mimeType: item.file.type,
            fileSize: item.file.size,
            storageKey: item.filePath,
            uploadedById: user.id,
          },
        });
      }
      await tx.branchTimelineEvent.create({
        data: {
          branchId: task.branchId,
          userId: user.id,
          action: "TASK_EVIDENCE_UPLOADED",
          entityType: "BranchTask",
          entityId: taskId,
          description: "Göreve kanıt yüklendi.",
        },
      });
    });
    refresh(task.branchId);

    return { success: true, message: "Kanıt yüklendi." };
  } catch {
    await Promise.all(stored.map((item) => storage.remove(item.filePath)));
    return { success: false, message: "Kanıt yüklenemedi." };
  }
}

export async function submitBranchTask(taskId: string, formData: FormData) {
  void formData;
  const user = await requireUser();
  const task = await prisma.branchTask.findUnique({ where: { id: taskId }, include: { evidence: true } });
  if (!task || !(await canAccessBranch(task.branchId))) return;

  const photoCount = task.evidence.filter((item) => item.evidenceType === "PHOTO").length;
  const videoCount = task.evidence.filter((item) => item.evidenceType === "VIDEO").length;
  const fileCount = task.evidence.filter((item) => ["FILE", "DOCUMENT"].includes(item.evidenceType)).length;
  const textCount = task.evidence.filter((item) => item.evidenceType === "TEXT" && item.description?.trim()).length;
  if (task.requiresPhoto && photoCount < Math.max(1, task.minimumPhotoCount)) throw new Error(`Görevi göndermek için en az ${Math.max(1, task.minimumPhotoCount)} fotoğraf yüklemelisiniz.`);
  if (task.requiresVideo && videoCount < Math.max(1, task.minimumVideoCount)) throw new Error(`Görevi göndermek için en az ${Math.max(1, task.minimumVideoCount)} video yüklemelisiniz.`);
  if (task.requiresFile && fileCount < Math.max(1, task.minimumFileCount)) throw new Error(`Görevi göndermek için en az ${Math.max(1, task.minimumFileCount)} dosya yüklemelisiniz.`);
  if ((task.requiresDescription || task.requiresResultNote) && textCount < 1) throw new Error("Görevi göndermek için sonuç açıklaması girmelisiniz.");

  const nextStatus = task.requiresApproval ? "SUBMITTED" : "COMPLETED";
  await prisma.$transaction([
    prisma.branchTask.update({
      where: { id: taskId },
      data: {
        status: nextStatus,
        submittedAt: new Date(),
        completedAt: nextStatus === "COMPLETED" ? new Date() : null,
        progress: nextStatus === "COMPLETED" ? 100 : 80,
      },
    }),
    prisma.branchTimelineEvent.create({
      data: {
        branchId: task.branchId,
        userId: user.id,
        action: nextStatus === "COMPLETED" ? "TASK_COMPLETED" : "TASK_SUBMITTED",
        entityType: "BranchTask",
        entityId: taskId,
        description: nextStatus === "COMPLETED" ? "Görev kanıtlarla tamamlandı." : "Görev merkez onayına gönderildi.",
      },
    }),
  ]);
  refresh(task.branchId);
}

export async function approveBranchTask(taskId: string, formData: FormData) {
  void formData;
  const user = await requirePermission("tasks");
  const task = await prisma.branchTask.findUnique({ where: { id: taskId }, select: { branchId: true, status: true } });
  if (!task) return;
  await prisma.$transaction([
    prisma.branchTask.update({ where: { id: taskId }, data: { status: "COMPLETED", reviewedAt: new Date(), approvedAt: new Date(), completedAt: new Date(), reviewerUserId: user.id, progress: 100 } }),
    prisma.branchTimelineEvent.create({ data: { branchId: task.branchId, userId: user.id, action: "TASK_APPROVED", entityType: "BranchTask", entityId: taskId, description: "Görev merkez tarafından onaylandı ve tamamlandı." } }),
  ]);
  refresh(task.branchId);
}

export async function rejectBranchTask(taskId: string, formData: FormData) {
  const user = await requirePermission("tasks");
  const reason = String(formData.get("rejectionReason") ?? "").trim();
  if (!reason) throw new Error("Reddetme açıklaması zorunludur.");
  const task = await prisma.branchTask.findUnique({ where: { id: taskId }, select: { branchId: true } });
  if (!task) return;
  await prisma.$transaction([
    prisma.branchTask.update({ where: { id: taskId }, data: { status: "REJECTED", reviewedAt: new Date(), rejectedAt: new Date(), reviewerUserId: user.id, rejectionReason: reason, progress: 50 } }),
    prisma.branchTimelineEvent.create({ data: { branchId: task.branchId, userId: user.id, action: "TASK_REJECTED", entityType: "BranchTask", entityId: taskId, description: `Görev reddedildi: ${reason}` } }),
  ]);
  refresh(task.branchId);
}
