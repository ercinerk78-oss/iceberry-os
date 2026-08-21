import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  defaultOpeningDocumentItems,
  defaultOpeningSetupItems,
  HIDDEN_OPENING_DOCUMENT_TITLES,
  isHotelOpeningConcept,
} from "@/lib/opening-checklists";

type ChecklistItemInput = {
  category: string;
  title: string;
  description?: string | null;
  responsibleDepartment: string;
  status?: string;
  createdById?: string;
};

type OpeningChecklistTx = Pick<Prisma.TransactionClient, "openingSetupChecklistItem" | "openingDocumentChecklistItem">;

export class OpeningChecklistService {
  static async ensureForProject(projectId: string, userId?: string) {
    const project = await prisma.openingProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        branchId: true,
        branchConcept: true,
        branch: { select: { concept: true, conceptType: true } },
      },
    });

    if (!project) throw new Error("Açılış projesi bulunamadı.");
    const concept = project.branchConcept || project.branch.concept || project.branch.conceptType;
    if (isHotelOpeningConcept(concept)) return { skipped: true, message: "Hotel konsepti açılış kurulum checklist kapsamı dışında." };

    await prisma.$transaction((tx) => OpeningChecklistService.seedForProjectInTransaction(tx, project, userId));

    return { skipped: false, message: "Kurulum ve evrak checklist'i hazırlandı." };
  }

  static async seedForProjectInTransaction(
    tx: OpeningChecklistTx,
    project: { id: string; branchId: string; branchConcept?: string | null },
    userId?: string | null,
  ) {
    if (isHotelOpeningConcept(project.branchConcept)) return;

    await tx.openingSetupChecklistItem.createMany({
      data: defaultOpeningSetupItems.map((item) => ({
        openingProjectId: project.id,
        branchId: project.branchId,
        category: item.category,
        title: item.title,
        description: item.description ?? null,
        responsibleDepartment: item.responsibleDepartment,
        sourceType: "TEMPLATE",
        templateKey: item.key,
        sortOrder: item.sortOrder,
        createdById: userId,
      })),
      skipDuplicates: true,
    });
    await tx.openingDocumentChecklistItem.createMany({
      data: defaultOpeningDocumentItems.map((item) => ({
        openingProjectId: project.id,
        branchId: project.branchId,
        category: item.category,
        title: item.title,
        description: item.description ?? null,
        companyTypeCondition: item.companyTypeCondition ?? null,
        responsibleDepartment: item.responsibleDepartment,
        sourceType: "TEMPLATE",
        templateKey: item.key,
        sortOrder: item.sortOrder,
        createdById: userId,
      })),
      skipDuplicates: true,
    });
  }

  static async createSetupItem(projectId: string, input: ChecklistItemInput) {
    const project = await prisma.openingProject.findUnique({
      where: { id: projectId },
      select: { id: true, branchId: true },
    });
    if (!project) throw new Error("Açılış projesi bulunamadı.");

    return prisma.openingSetupChecklistItem.create({
      data: {
        openingProjectId: project.id,
        branchId: project.branchId,
        category: input.category,
        title: input.title,
        description: input.description || null,
        responsibleDepartment: input.responsibleDepartment,
        status: input.status || "BEKLIYOR",
        sourceType: "MANUAL",
        createdById: input.createdById,
      },
    });
  }

  static async completeSetupItem(itemId: string, userId: string, closingNote: string, selectedOption?: string | null) {
    if (!closingNote.trim()) throw new Error("Tamamlama notu zorunludur.");
    return prisma.openingSetupChecklistItem.update({
      where: { id: itemId },
      data: {
        status: "TAMAMLANDI",
        selectedOption: selectedOption || null,
        closingNote,
        completedById: userId,
        completedAt: new Date(),
      },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async setSetupItemStatus(itemId: string, status: string) {
    if (!["BEKLIYOR", "MERKEZDE", "YATIRIMCIDA", "DEVAM_EDIYOR", "TAMAMLANDI", "IPTAL"].includes(status)) {
      throw new Error("Geçersiz kurulum durumu.");
    }

    return prisma.openingSetupChecklistItem.update({
      where: { id: itemId },
      data: {
        status,
        completedAt: status === "TAMAMLANDI" ? new Date() : null,
      },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async archiveSetupItem(itemId: string) {
    return prisma.openingSetupChecklistItem.update({
      where: { id: itemId },
      data: { archivedAt: new Date() },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async createDocumentItem(projectId: string, input: ChecklistItemInput & { companyTypeCondition?: string | null }) {
    const project = await prisma.openingProject.findUnique({
      where: { id: projectId },
      select: { id: true, branchId: true },
    });
    if (!project) throw new Error("Açılış projesi bulunamadı.");

    return prisma.openingDocumentChecklistItem.create({
      data: {
        openingProjectId: project.id,
        branchId: project.branchId,
        category: input.category,
        title: input.title,
        description: input.description || null,
        companyTypeCondition: input.companyTypeCondition || null,
        responsibleDepartment: input.responsibleDepartment,
        status: input.status || "TALEP_EDILDI",
        sourceType: "MANUAL",
        createdById: input.createdById,
      },
    });
  }

  static async setDocumentItemStatus(itemId: string, status: string, userId: string, note?: string | null) {
    if (!["TALEP_EDILDI", "BEKLENIYOR", "GELDI", "KONTROL_EDILDI", "EKSIK", "GEREKLI_DEGIL"].includes(status)) {
      throw new Error("Geçersiz evrak durumu.");
    }

    return prisma.openingDocumentChecklistItem.update({
      where: { id: itemId },
      data: {
        status,
        note: note || null,
        completedById: ["KONTROL_EDILDI", "GEREKLI_DEGIL"].includes(status) ? userId : null,
        completedAt: ["KONTROL_EDILDI", "GEREKLI_DEGIL"].includes(status) ? new Date() : null,
      },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async archiveDocumentItem(itemId: string) {
    return prisma.openingDocumentChecklistItem.update({
      where: { id: itemId },
      data: { archivedAt: new Date() },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async recalculateProjectProgress(projectId: string) {
    const [setupItems, documentItems] = await Promise.all([
      prisma.openingSetupChecklistItem.findMany({
        where: { openingProjectId: projectId, archivedAt: null },
        select: { status: true },
      }),
      prisma.openingDocumentChecklistItem.findMany({
        where: { openingProjectId: projectId, archivedAt: null, title: { notIn: [...HIDDEN_OPENING_DOCUMENT_TITLES] } },
        select: { status: true },
      }),
    ]);
    const setupProgress = percentage(setupItems, ["TAMAMLANDI"]);
    const documentProgress = percentage(documentItems, ["KONTROL_EDILDI", "GEREKLI_DEGIL"]);
    const hasDocuments = documentItems.length > 0;
    const readiness = hasDocuments ? Math.round((setupProgress + documentProgress) / 2) : setupProgress;

    await prisma.openingProject.update({
      where: { id: projectId },
      data: {
        progressPercentage: setupProgress,
        openingReadinessScore: readiness,
      },
    });
  }
}

function percentage(items: { status: string }[], completedStatuses: string[]) {
  if (!items.length) return 0;
  const completed = items.filter((item) => completedStatuses.includes(item.status)).length;
  return Math.round((completed / items.length) * 100);
}
