import { Prisma } from "@prisma/client";

import { academyCode, corporateDocumentCategorySeed, trainingCategorySeed } from "@/lib/academy";
import { prisma } from "@/lib/prisma";

export class AcademyService {
  static async ensureDefaults(userId?: string) {
    await prisma.$transaction(async (tx) => {
      for (const [index, name] of trainingCategorySeed.entries()) {
        await tx.trainingCategory.upsert({
          where: { code: academyCode(name) },
          update: { name, sortOrder: index, isActive: true },
          create: { name, code: academyCode(name), sortOrder: index, isActive: true },
        });
      }

      for (const [index, name] of corporateDocumentCategorySeed.entries()) {
        await tx.corporateDocumentCategory.upsert({
          where: { code: academyCode(name) },
          update: { name, sortOrder: index, isActive: true },
          create: { name, code: academyCode(name), sortOrder: index, isActive: true },
        });
      }
    });

    await this.ensureOrientationProgram(userId);
  }

  static async ensureOrientationProgram(userId?: string) {
    const category = await prisma.trainingCategory.findUnique({ where: { code: "MARKA_ORYANTASYONU" } });
    if (!category) return;

    const program = await prisma.trainingProgram.upsert({
      where: { code_version: { code: "YENI_PERSONEL_ORYANTASYONU", version: 1 } },
      update: {},
      create: {
        title: "Yeni Personel Oryantasyonu",
        code: "YENI_PERSONEL_ORYANTASYONU",
        description: "Yeni şube personeli için marka, hijyen, operasyon ve müşteri deneyimi başlangıç eğitimi.",
        categoryId: category.id,
        version: 1,
        status: "PUBLISHED",
        difficultyLevel: "BEGINNER",
        estimatedDurationMinutes: 240,
        passingScore: 70,
        maximumAttempts: 3,
        requiresCertificate: true,
        requiresFinalExam: true,
        allowSelfEnrollment: false,
        isMandatory: true,
        createdById: userId,
        publishedAt: new Date(),
      },
    });

    const trainingModule = await prisma.trainingModule.upsert({
      where: { id: `orientation-module-${program.id}` },
      update: {},
      create: {
        id: `orientation-module-${program.id}`,
        programId: program.id,
        title: "Iceberry Başlangıç Paketi",
        description: "Marka kültürü, hijyen, ürün standartları ve şube günlük akışı.",
        sortOrder: 1,
        estimatedDurationMinutes: 180,
        completionRule: "Tüm dersleri tamamla ve final sınavını geç.",
      },
    });

    const lessonTitles = [
      ["Iceberry Marka Tanıtımı", "TEXT"],
      ["İş Yeri Kuralları", "ACKNOWLEDGEMENT"],
      ["Gıda Güvenliği", "TEXT"],
      ["Hijyen Standartları", "DOCUMENT"],
      ["Ürünlere Giriş", "TEXT"],
      ["Reçete Standartları", "DOCUMENT"],
      ["Ekipman Kullanımı", "VIDEO"],
      ["Müşteri Karşılama", "TEXT"],
      ["Kasa ve POS", "TEXT"],
      ["Stok Kullanımı", "TEXT"],
      ["Açılış ve Kapanış Kontrolleri", "ACKNOWLEDGEMENT"],
      ["Acil Durum Prosedürleri", "DOCUMENT"],
      ["Final Sınavı", "QUIZ"],
    ] as const;

    for (const [index, [title, lessonType]] of lessonTitles.entries()) {
      await prisma.trainingLesson.upsert({
        where: { id: `orientation-lesson-${program.id}-${index + 1}` },
        update: {},
        create: {
          id: `orientation-lesson-${program.id}-${index + 1}`,
          moduleId: trainingModule.id,
          title,
          description: `${title} içeriği akademi yönetimi tarafından güncellenebilir.`,
          lessonType,
          sortOrder: index + 1,
          estimatedDurationMinutes: lessonType === "QUIZ" ? 30 : 15,
          requiresAcknowledgement: lessonType === "ACKNOWLEDGEMENT",
          contentHtml: lessonType === "TEXT" ? `<p>${title} eğitimi Iceberry standartlarına göre tamamlanmalıdır.</p>` : null,
        },
      });
    }

    await prisma.learningPath.upsert({
      where: { code_version: { code: "SUBE_PERSONELI_ORYANTASYONU", version: 1 } },
      update: {},
      create: {
        name: "Yeni Şube Personeli Oryantasyonu",
        code: "SUBE_PERSONELI_ORYANTASYONU",
        description: "Şube personeli için zorunlu başlangıç eğitim yolu.",
        version: 1,
        status: "PUBLISHED",
        targetRoleCode: "BRANCH_STAFF",
        estimatedDurationMinutes: 240,
        publishedAt: new Date(),
        programs: { create: { programId: program.id, sortOrder: 1, isRequired: true, dueOffsetDays: 7 } },
      },
    });
  }

  static async metrics() {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 86400000);
    const [
      categoryCount,
      programCount,
      publishedProgramCount,
      assignmentCount,
      overdueAssignmentCount,
      certificateCount,
      expiringCertificateCount,
      corporateDocumentCount,
      acknowledgementCount,
      overdueAcknowledgementCount,
      liveSessionCount,
    ] = await Promise.all([
      prisma.trainingCategory.count({ where: { isActive: true } }),
      prisma.trainingProgram.count({ where: { archivedAt: null } }),
      prisma.trainingProgram.count({ where: { status: "PUBLISHED", archivedAt: null } }),
      prisma.trainingAssignment.count(),
      prisma.trainingAssignment.count({ where: { dueAt: { lt: now }, status: { in: ["ASSIGNED", "NOT_STARTED", "IN_PROGRESS"] } } }),
      prisma.trainingCertificate.count({ where: { status: "ACTIVE" } }),
      prisma.trainingCertificate.count({ where: { status: "ACTIVE", validUntil: { gte: now, lte: soon } } }),
      prisma.corporateDocument.count({ where: { archivedAt: null } }),
      prisma.documentAcknowledgement.count(),
      prisma.documentAcknowledgement.count({ where: { dueAt: { lt: now }, status: { in: ["ASSIGNED", "OPENED"] } } }),
      prisma.liveTrainingSession.count({ where: { startsAt: { gte: now } } }),
    ]);

    return {
      categoryCount,
      programCount,
      publishedProgramCount,
      assignmentCount,
      overdueAssignmentCount,
      certificateCount,
      expiringCertificateCount,
      corporateDocumentCount,
      acknowledgementCount,
      overdueAcknowledgementCount,
      liveSessionCount,
    };
  }

  static async latestOverview() {
    const [programs, assignments, documents, certificates, liveSessions] = await Promise.all([
      prisma.trainingProgram.findMany({
        include: { category: { select: { name: true } }, _count: { select: { modules: true, assignments: true } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.trainingAssignment.findMany({
        include: { program: { select: { title: true } } },
        orderBy: { assignedAt: "desc" },
        take: 8,
      }),
      prisma.corporateDocument.findMany({
        include: { category: { select: { name: true } }, versions: { orderBy: { version: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.trainingCertificate.findMany({
        include: { program: { select: { title: true } } },
        orderBy: { issuedAt: "desc" },
        take: 6,
      }),
      prisma.liveTrainingSession.findMany({ orderBy: { startsAt: "asc" }, take: 6 }),
    ]);

    return { programs, assignments, documents, certificates, liveSessions };
  }

  static async calculateCompliance(branchId?: string) {
    const where: Prisma.TrainingAssignmentWhereInput = branchId ? { branchId } : {};
    const [total, completed, overdue] = await Promise.all([
      prisma.trainingAssignment.count({ where }),
      prisma.trainingAssignment.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.trainingAssignment.count({ where: { ...where, status: "OVERDUE" } }),
    ]);

    const score = total ? Math.max(0, Math.round((completed / total) * 100 - overdue * 2)) : 100;
    return { total, completed, overdue, score };
  }
}
