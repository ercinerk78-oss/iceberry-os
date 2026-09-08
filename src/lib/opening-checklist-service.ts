import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  defaultOpeningDocumentItems,
  defaultOpeningSetupItems,
  HIDDEN_OPENING_DOCUMENT_TITLES,
  isHotelOpeningConcept,
  isOpeningLogisticsCategory,
  OPENING_LOGISTICS_STATUSES,
  weightedOpeningPlanPercentage,
} from "@/lib/opening-checklists";

type ChecklistItemInput = {
  category: string;
  title: string;
  description?: string | null;
  responsibleDepartment: string;
  status?: string;
  plannedQuantity?: number | null;
  quantityUnit?: string | null;
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

  static async syncSetupTemplate(projectId: string, userId?: string | null) {
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
    if (isHotelOpeningConcept(concept)) return { skipped: true, project };

    const currentTemplateKeys = defaultOpeningSetupItems.map((item) => item.key);
    await prisma.$transaction(async (tx) => {
      await tx.openingSetupChecklistItem.updateMany({
        where: {
          openingProjectId: project.id,
          sourceType: "TEMPLATE",
          templateKey: { notIn: currentTemplateKeys },
          archivedAt: null,
        },
        data: { archivedAt: new Date() },
      });

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
    });

    return { skipped: false, project };
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
        plannedQuantity: input.plannedQuantity ?? null,
        quantityUnit: input.quantityUnit || "Adet",
        sourceType: "MANUAL",
        createdById: input.createdById,
      },
    });
  }

  static async updateSetupItem(itemId: string, input: ChecklistItemInput, userId?: string | null) {
    if (!["BEKLIYOR", "MERKEZDE", "YATIRIMCIDA", "IMALATTA", "DEVAM_EDIYOR", "TAMAMLANDI", "IPTAL"].includes(input.status || "BEKLIYOR")) {
      throw new Error("Geçersiz kurulum durumu.");
    }

    return prisma.openingSetupChecklistItem.update({
      where: { id: itemId },
      data: {
        category: input.category,
        title: input.title,
        description: input.description || null,
        responsibleDepartment: input.responsibleDepartment,
        status: input.status || "BEKLIYOR",
        plannedQuantity: input.plannedQuantity ?? null,
        quantityUnit: input.quantityUnit || "Adet",
        completedById: input.status === "TAMAMLANDI" ? userId : null,
        completedAt: input.status === "TAMAMLANDI" ? new Date() : null,
      },
      select: { openingProjectId: true, branchId: true },
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

  static async setSetupItemStatus(itemId: string, status: string, userId?: string | null, closingNote?: string | null, selectedOption?: string | null) {
    if (!["BEKLIYOR", "MERKEZDE", "YATIRIMCIDA", "IMALATTA", "DEVAM_EDIYOR", "TAMAMLANDI", "IPTAL"].includes(status)) {
      throw new Error("Geçersiz kurulum durumu.");
    }

    return prisma.openingSetupChecklistItem.update({
      where: { id: itemId },
      data: {
        status,
        selectedOption: selectedOption || undefined,
        closingNote: closingNote?.trim() || undefined,
        completedById: status === "TAMAMLANDI" ? userId : null,
        completedAt: status === "TAMAMLANDI" ? new Date() : null,
      },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async setSetupItemLogisticsStatus(itemId: string, status: string, userId?: string | null, note?: string | null) {
    if (!OPENING_LOGISTICS_STATUSES.some(([value]) => value === status)) {
      throw new Error("Geçersiz tedarik durumu.");
    }

    const item = await prisma.openingSetupChecklistItem.findUnique({
      where: { id: itemId },
      select: { id: true, category: true, status: true },
    });
    if (!item) throw new Error("Kurulum kalemi bulunamadı.");
    if (!isOpeningLogisticsCategory(item.category)) {
      throw new Error("Bu kalemde tedarik durumu takip edilmez.");
    }

    const trimmedNote = note?.trim() || null;
    const isDelivered = status === "TESLIM_EDILDI";

    return prisma.$transaction(async (tx) => {
      const updated = await tx.openingSetupChecklistItem.update({
        where: { id: itemId },
        data: {
          logisticsStatus: status,
          logisticsNote: trimmedNote,
          logisticsUpdatedAt: new Date(),
          logisticsUpdatedById: userId ?? null,
          status: isDelivered ? "TAMAMLANDI" : undefined,
          selectedOption: isDelivered ? "SATIN_ALINDI" : undefined,
          completedById: isDelivered ? userId : undefined,
          completedAt: isDelivered ? new Date() : undefined,
        },
        select: { openingProjectId: true, branchId: true },
      });

      await tx.openingSetupChecklistLogisticsUpdate.create({
        data: {
          itemId,
          status,
          note: trimmedNote,
          createdById: userId ?? null,
        },
      });

      return updated;
    });
  }

  static async archiveSetupItem(itemId: string) {
    return prisma.openingSetupChecklistItem.update({
      where: { id: itemId },
      data: { archivedAt: new Date() },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async restoreSetupItem(itemId: string) {
    return prisma.openingSetupChecklistItem.update({
      where: { id: itemId },
      data: { archivedAt: null },
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
    const [setupItems, documentItems, supplyItems] = await Promise.all([
      prisma.openingSetupChecklistItem.findMany({
        where: { openingProjectId: projectId, archivedAt: null },
        select: { category: true, status: true },
      }),
      prisma.openingDocumentChecklistItem.findMany({
        where: { openingProjectId: projectId, archivedAt: null, title: { notIn: [...HIDDEN_OPENING_DOCUMENT_TITLES] } },
        select: { status: true },
      }),
      prisma.openingSupplyItem.findMany({
        where: { openingProjectId: projectId, archivedAt: null },
        select: { section: true, status: true },
      }),
    ]);
    const setupProgress = weightedOpeningPlanPercentage(setupItems, supplyItems);
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
