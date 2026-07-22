"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  ACADEMY_MAX_FILE_SIZE,
  academyMediaTypeFromFile,
  clampProgress,
  lessonTypeFromMediaType,
  sourceTypeFromUrl,
} from "@/lib/academy-lms";
import { AcademyService } from "@/lib/academy-service";
import { requirePermission, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

type AcademyState = { success: boolean; message: string };

const programSchema = z.object({
  title: z.string().trim().min(3, "Eğitim adı zorunludur."),
  code: z.string().trim().min(2, "Eğitim kodu zorunludur."),
  categoryId: z.string().min(1, "Kategori seçimi zorunludur."),
  description: z.string().trim().optional(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedDurationMinutes: z.coerce.number().int().min(0).default(0),
  instructorName: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  tags: z.string().trim().optional(),
  passingScore: z.coerce.number().int().min(0).max(100).default(70),
  maximumAttempts: z.coerce.number().int().min(1).max(20).default(3),
  isMandatory: z.preprocess((value) => value === "on", z.boolean()),
  requiresCertificate: z.preprocess((value) => value === "on", z.boolean()),
  requiresFinalExam: z.preprocess((value) => value === "on", z.boolean()),
});

const assignmentSchema = z.object({
  programId: z.string().min(1, "Eğitim seçimi zorunludur."),
  userId: z.string().min(1, "Kullanıcı seçimi zorunludur."),
  branchId: z.string().optional(),
  dueAt: z.string().optional(),
});
const programStatusSchema = z.enum(["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]);

const mediaLinkSchema = z.object({
  programId: z.string().min(1, "Eğitim seçimi zorunludur."),
  title: z.string().trim().min(2, "İçerik başlığı zorunludur."),
  description: z.string().trim().optional(),
  url: z.string().trim().url("Geçerli bir YouTube veya Vimeo linki girin."),
  durationSeconds: z.coerce.number().int().min(0).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  thumbnailUrl: z.string().trim().url().optional().or(z.literal("")),
});

const mediaUploadSchema = z.object({
  programId: z.string().min(1, "Eğitim seçimi zorunludur."),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  durationSeconds: z.coerce.number().int().min(0).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  thumbnailUrl: z.string().trim().url().optional().or(z.literal("")),
});

export async function ensureAcademyDefaults() {
  const user = await requirePermission("academy.manage");
  await AcademyService.ensureDefaults(user.id);
  revalidatePath("/academy");
}

export async function createTrainingProgram(_: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await requirePermission("academy.manage");
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Eğitim formunu kontrol edin." };

  try {
    const normalizedCode = parsed.data.code.toLocaleUpperCase("tr-TR").replace(/[^A-Z0-9_]/g, "_");
    await prisma.trainingProgram.create({
      data: {
        ...parsed.data,
        code: normalizedCode,
        version: 1,
        createdById: user.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TRAINING_PROGRAM_CREATED",
        entityType: "TrainingProgram",
        description: `${parsed.data.title} eğitimi oluşturuldu.`,
      },
    });
    revalidatePath("/academy");
    return { success: true, message: "Eğitim programı oluşturuldu." };
  } catch (error) {
    console.error("[academy] create program failed", error);
    return { success: false, message: "Eğitim programı oluşturulamadı. Kod daha önce kullanılmış olabilir." };
  }
}

export async function updateTrainingProgram(programId: string, _: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await requirePermission("academy.manage");
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Eğitim formunu kontrol edin." };

  try {
    const normalizedCode = parsed.data.code.toLocaleUpperCase("tr-TR").replace(/[^A-Z0-9_]/g, "_");
    await prisma.$transaction([
      prisma.trainingProgram.update({
        where: { id: programId },
        data: { ...parsed.data, code: normalizedCode },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "TRAINING_PROGRAM_UPDATED",
          entityType: "TrainingProgram",
          entityId: programId,
          description: `${parsed.data.title} eğitimi güncellendi.`,
        },
      }),
    ]);
    revalidatePath("/academy");
    return { success: true, message: "Eğitim güncellendi." };
  } catch (error) {
    console.error("[academy] update program failed", error);
    return { success: false, message: "Eğitim güncellenemedi. Kod daha önce kullanılmış olabilir." };
  }
}

export async function publishTrainingProgram(programId: string) {
  const user = await requirePermission("academy.manage");
  await prisma.$transaction([
    prisma.trainingProgram.update({
      where: { id: programId },
      data: { status: "PUBLISHED", approvedById: user.id, approvedAt: new Date(), publishedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TRAINING_PROGRAM_PUBLISHED",
        entityType: "TrainingProgram",
        entityId: programId,
        description: "Eğitim programı yayımlandı.",
      },
    }),
  ]);
  revalidatePath("/academy");
}

export async function setTrainingProgramStatus(programId: string, status: string) {
  const user = await requirePermission("academy.manage");
  const parsed = programStatusSchema.safeParse(status);
  if (!parsed.success) return;

  await prisma.$transaction([
    prisma.trainingProgram.update({
      where: { id: programId },
      data: {
        status: parsed.data,
        approvedById: parsed.data === "PUBLISHED" ? user.id : undefined,
        approvedAt: parsed.data === "PUBLISHED" ? new Date() : undefined,
        publishedAt: parsed.data === "PUBLISHED" ? new Date() : undefined,
        archivedAt: parsed.data === "ARCHIVED" ? new Date() : null,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TRAINING_PROGRAM_STATUS_CHANGED",
        entityType: "TrainingProgram",
        entityId: programId,
        description: `Eğitim durumu ${parsed.data} olarak güncellendi.`,
      },
    }),
  ]);
  revalidatePath("/academy");
}

export async function archiveTrainingProgram(programId: string) {
  await setTrainingProgramStatus(programId, "ARCHIVED");
}

export async function addAcademyMediaFiles(_: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await requirePermission("academy.manage");
  const parsed = mediaUploadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Medya formunu kontrol edin." };

  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (!files.length) return { success: false, message: "En az bir dosya seçin." };

  const uploaded: { file: File; stored: Awaited<ReturnType<typeof storage.save>>; mediaType: string }[] = [];

  try {
    for (const file of files) {
      if (file.size > ACADEMY_MAX_FILE_SIZE) return { success: false, message: "Dosya başına en fazla 100 MB yüklenebilir." };
      const mediaType = academyMediaTypeFromFile(file);
      if (!mediaType) return { success: false, message: `${file.name} desteklenen eğitim formatlarından biri değil.` };
      uploaded.push({ file, mediaType, stored: await storage.save(file) });
    }

    await prisma.$transaction(async (tx) => {
      const program = await tx.trainingProgram.findUnique({ where: { id: parsed.data.programId }, select: { id: true, title: true } });
      if (!program) throw new Error("Eğitim bulunamadı.");
      const contentModule = await ensureContentModule(tx, program.id);

      for (const [index, item] of uploaded.entries()) {
        const title = parsed.data.title || item.file.name;
        const sortOrder = parsed.data.sortOrder + index;
        const lesson = await tx.trainingLesson.create({
          data: {
            moduleId: contentModule.id,
            title,
            description: parsed.data.description || null,
            lessonType: lessonTypeFromMediaType(item.mediaType),
            sortOrder,
            estimatedDurationMinutes: Math.ceil((parsed.data.durationSeconds || 0) / 60),
            minimumWatchPercentage: item.mediaType === "VIDEO" ? 90 : 100,
          },
        });
        await tx.academyMediaAsset.create({
          data: {
            programId: program.id,
            lessonId: lesson.id,
            title,
            description: parsed.data.description || null,
            mediaType: item.mediaType,
            sourceType: "FILE",
            originalFileName: item.file.name,
            fileName: item.stored.fileName,
            filePath: item.stored.filePath,
            fileUrl: item.stored.fileUrl || item.stored.filePath,
            mimeType: item.file.type || "application/octet-stream",
            fileSize: item.file.size,
            durationSeconds: parsed.data.durationSeconds || null,
            sortOrder,
            thumbnailUrl: parsed.data.thumbnailUrl || null,
            uploadedById: user.id,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ACADEMY_MEDIA_UPLOADED",
          entityType: "TrainingProgram",
          entityId: program.id,
          description: `${uploaded.length} eğitim içeriği yüklendi.`,
        },
      });
    });

    revalidatePath("/academy");
    return { success: true, message: "Eğitim içerikleri yüklendi." };
  } catch (error) {
    await Promise.all(uploaded.map((item) => storage.remove(item.stored.filePath)));
    console.error("[academy] media upload failed", error);
    return { success: false, message: error instanceof Error ? error.message : "Eğitim içeriği yüklenemedi." };
  }
}

export async function addAcademyMediaLink(_: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await requirePermission("academy.manage");
  const parsed = mediaLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Link formunu kontrol edin." };

  const sourceType = sourceTypeFromUrl(parsed.data.url);
  if (!sourceType) return { success: false, message: "Yalnızca YouTube veya Vimeo linki eklenebilir." };

  try {
    await prisma.$transaction(async (tx) => {
      const program = await tx.trainingProgram.findUnique({ where: { id: parsed.data.programId }, select: { id: true } });
      if (!program) throw new Error("Eğitim bulunamadı.");
      const contentModule = await ensureContentModule(tx, program.id);
      const lesson = await tx.trainingLesson.create({
        data: {
          moduleId: contentModule.id,
          title: parsed.data.title,
          description: parsed.data.description || null,
          lessonType: "VIDEO",
          sortOrder: parsed.data.sortOrder,
          estimatedDurationMinutes: Math.ceil((parsed.data.durationSeconds || 0) / 60),
          externalUrl: parsed.data.url,
          minimumWatchPercentage: 90,
        },
      });
      await tx.academyMediaAsset.create({
        data: {
          programId: program.id,
          lessonId: lesson.id,
          title: parsed.data.title,
          description: parsed.data.description || null,
          mediaType: sourceType,
          sourceType,
          fileUrl: parsed.data.url,
          durationSeconds: parsed.data.durationSeconds || null,
          sortOrder: parsed.data.sortOrder,
          thumbnailUrl: parsed.data.thumbnailUrl || null,
          uploadedById: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ACADEMY_MEDIA_LINK_ADDED",
          entityType: "TrainingProgram",
          entityId: program.id,
          description: "Eğitime video linki eklendi.",
        },
      });
    });
    revalidatePath("/academy");
    return { success: true, message: "Video linki eğitime eklendi." };
  } catch (error) {
    console.error("[academy] media link failed", error);
    return { success: false, message: error instanceof Error ? error.message : "Video linki eklenemedi." };
  }
}

export async function recordLessonProgress(input: { lessonId: string; progressPercentage: number; watchedSeconds: number; lastPositionSeconds: number; completed?: boolean }) {
  const user = await requireUser();
  const lesson = await prisma.trainingLesson.findUnique({
    where: { id: input.lessonId },
    include: { module: { select: { programId: true, program: { select: { version: true } } } } },
  });
  if (!lesson) return { success: false };

  const progressPercentage = clampProgress(input.completed ? 100 : input.progressPercentage);
  const completed = input.completed || progressPercentage >= lesson.minimumWatchPercentage;

  await prisma.$transaction(async (tx) => {
    const assignment = await tx.trainingAssignment.upsert({
      where: {
        programId_programVersion_userId_sourceType_sourceId: {
          programId: lesson.module.programId,
          programVersion: lesson.module.program.version,
          userId: user.id,
          sourceType: "OTHER",
          sourceId: `SELF:${lesson.module.programId}`,
        },
      },
      update: {
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        startedAt: new Date(),
      },
      create: {
        programId: lesson.module.programId,
        programVersion: lesson.module.program.version,
        userId: user.id,
        sourceType: "OTHER",
        sourceId: `SELF:${lesson.module.programId}`,
        assignedById: user.id,
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    await tx.lessonProgress.upsert({
      where: { assignmentId_lessonId: { assignmentId: assignment.id, lessonId: lesson.id } },
      update: {
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        progressPercentage,
        watchedSeconds: Math.max(0, Math.round(input.watchedSeconds || 0)),
        lastPositionSeconds: Math.max(0, Math.round(input.lastPositionSeconds || 0)),
        startedAt: new Date(),
        completedAt: completed ? new Date() : null,
        lastAccessedAt: new Date(),
      },
      create: {
        assignmentId: assignment.id,
        lessonId: lesson.id,
        userId: user.id,
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        progressPercentage,
        watchedSeconds: Math.max(0, Math.round(input.watchedSeconds || 0)),
        lastPositionSeconds: Math.max(0, Math.round(input.lastPositionSeconds || 0)),
        startedAt: new Date(),
        completedAt: completed ? new Date() : null,
        lastAccessedAt: new Date(),
      },
    });

    const [requiredLessonCount, completedLessonCount] = await Promise.all([
      tx.trainingLesson.count({ where: { module: { programId: lesson.module.programId }, isRequired: true } }),
      tx.lessonProgress.count({ where: { assignmentId: assignment.id, status: "COMPLETED", lesson: { isRequired: true } } }),
    ]);
    const assignmentProgress = requiredLessonCount ? clampProgress((completedLessonCount / requiredLessonCount) * 100) : progressPercentage;
    await tx.trainingAssignment.update({
      where: { id: assignment.id },
      data: {
        progressPercentage: assignmentProgress,
        status: assignmentProgress >= 100 ? "COMPLETED" : "IN_PROGRESS",
        completedAt: assignmentProgress >= 100 ? new Date() : null,
      },
    });
  });

  revalidatePath("/academy");
  return { success: true };
}

export async function assignTraining(_: AcademyState, formData: FormData): Promise<AcademyState> {
  const user = await requirePermission("academy.assign");
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Atama formunu kontrol edin." };

  const program = await prisma.trainingProgram.findUnique({ where: { id: parsed.data.programId }, select: { id: true, title: true, version: true, status: true } });
  if (!program) return { success: false, message: "Eğitim bulunamadı." };
  if (program.status !== "PUBLISHED") return { success: false, message: "Yayımlanmamış eğitim atanamaz." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.trainingAssignment.upsert({
        where: {
          programId_programVersion_userId_sourceType_sourceId: {
            programId: program.id,
            programVersion: program.version,
            userId: parsed.data.userId,
            sourceType: "MANUAL",
            sourceId: "MANUAL",
          },
        },
        update: {
          status: "ASSIGNED",
          dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
          branchId: parsed.data.branchId || null,
        },
        create: {
          programId: program.id,
          programVersion: program.version,
          userId: parsed.data.userId,
          branchId: parsed.data.branchId || null,
          sourceType: "MANUAL",
          sourceId: "MANUAL",
          assignedById: user.id,
          dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        },
      });
      await tx.notification.create({
        data: {
          userId: parsed.data.userId,
          type: "TRAINING_ASSIGNED",
          title: "Yeni eğitim atandı",
          message: `${program.title} eğitimi size atandı.`,
          entityType: "TrainingProgram",
          entityId: program.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "TRAINING_ASSIGNED",
          entityType: "TrainingProgram",
          entityId: program.id,
          description: `${program.title} eğitimi kullanıcıya atandı.`,
        },
      });
    });
    revalidatePath("/academy");
    return { success: true, message: "Eğitim ataması oluşturuldu." };
  } catch (error) {
    console.error("[academy] assign failed", error);
    return { success: false, message: "Eğitim ataması oluşturulamadı." };
  }
}

export async function acknowledgeDocument(acknowledgementId: string) {
  const user = await requireUser();
  const acknowledgement = await prisma.documentAcknowledgement.findFirst({ where: { id: acknowledgementId, userId: user.id } });
  if (!acknowledgement) return;

  await prisma.documentAcknowledgement.update({
    where: { id: acknowledgementId },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), evidenceText: "Kullanıcı dokümanı okuduğunu ve kabul ettiğini onayladı." },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DOCUMENT_ACKNOWLEDGED",
      entityType: "CorporateDocument",
      entityId: acknowledgement.corporateDocumentId,
      description: "Doküman okundu ve kabul edildi.",
    },
  });
  revalidatePath("/academy");
}

type AcademyTransaction = Prisma.TransactionClient;

async function ensureContentModule(tx: AcademyTransaction, programId: string) {
  const existing = await tx.trainingModule.findFirst({
    where: { programId, title: "Eğitim İçerikleri" },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  if (existing) return existing;

  return tx.trainingModule.create({
    data: {
      programId,
      title: "Eğitim İçerikleri",
      description: "Video, doküman, görsel ve bağlantı içerikleri.",
      sortOrder: 1,
      completionRule: "Gerekli içerikleri tamamla.",
    },
    select: { id: true },
  });
}
