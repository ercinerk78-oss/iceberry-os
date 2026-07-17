"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AcademyService } from "@/lib/academy-service";
import { requirePermission, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AcademyState = { success: boolean; message: string };

const programSchema = z.object({
  title: z.string().trim().min(3, "Eğitim adı zorunludur."),
  code: z.string().trim().min(2, "Eğitim kodu zorunludur."),
  categoryId: z.string().min(1, "Kategori seçimi zorunludur."),
  description: z.string().trim().optional(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedDurationMinutes: z.coerce.number().int().min(0).default(0),
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
