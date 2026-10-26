import type { Prisma } from "@prisma/client";

import {
  defaultOpeningSupplyItems,
  OPENING_SUPPLY_LOGISTICS_STATUSES,
  OPENING_SUPPLY_RESPONSIBLE_PARTIES,
  OPENING_SUPPLY_SECTIONS,
  OPENING_SUPPLY_SOURCE_CATEGORIES,
  OPENING_SUPPLY_STATUSES,
} from "@/lib/opening-supplies";
import { prisma } from "@/lib/prisma";

type OpeningSupplyTx = Pick<Prisma.TransactionClient, "openingSupplyItem">;

export type OpeningSupplyInput = {
  section: string;
  category?: string | null;
  title: string;
  description?: string | null;
  plannedQuantity?: number | null;
  quantityUnit?: string | null;
  responsibleParty?: string | null;
  status?: string | null;
  createdById?: string | null;
};

export class OpeningSupplyService {
  static async ensureForProject(projectId: string, userId?: string | null) {
    const project = await prisma.openingProject.findUnique({
      where: { id: projectId },
      select: { id: true, branchId: true },
    });
    if (!project) throw new Error("Açılış projesi bulunamadı.");

    await prisma.$transaction((tx) => OpeningSupplyService.seedForProjectInTransaction(tx, project, userId));
    return { message: "Ekipman, züccaciye ve açılış malı ürün listesi hazırlandı." };
  }

  static async syncTemplateSection(projectId: string, section: string, userId?: string | null) {
    if (!OPENING_SUPPLY_SECTIONS.some(([value]) => value === section)) throw new Error("Geçersiz ürün sekmesi.");
    const project = await prisma.openingProject.findUnique({
      where: { id: projectId },
      select: { id: true, branchId: true },
    });
    if (!project) throw new Error("Açılış projesi bulunamadı.");

    const currentTemplateItems = defaultOpeningSupplyItems.filter((item) => item.section === section);
    const currentTemplateKeys = currentTemplateItems.map((item) => item.key);

    await prisma.$transaction(async (tx) => {
      await tx.openingSupplyItem.updateMany({
        where: {
          openingProjectId: project.id,
          section,
          sourceType: "TEMPLATE",
          templateKey: { notIn: currentTemplateKeys },
          archivedAt: null,
        },
        data: { archivedAt: new Date() },
      });

      await tx.openingSupplyItem.createMany({
        data: currentTemplateItems.map((item) => ({
          openingProjectId: project.id,
          branchId: project.branchId,
          section: item.section,
          category: item.category,
          title: item.title,
          plannedQuantity: item.plannedQuantity ?? null,
          quantityUnit: item.quantityUnit || "Adet",
          responsibleParty: item.responsibleParty,
          sourceType: "TEMPLATE",
          templateKey: item.key,
          sortOrder: item.sortOrder,
          createdById: userId ?? null,
        })),
        skipDuplicates: true,
      });
    });

    return project;
  }

  static async seedForProjectInTransaction(tx: OpeningSupplyTx, project: { id: string; branchId: string }, userId?: string | null) {
    await tx.openingSupplyItem.createMany({
      data: defaultOpeningSupplyItems.map((item) => ({
        openingProjectId: project.id,
        branchId: project.branchId,
        section: item.section,
        category: item.category,
        title: item.title,
        plannedQuantity: item.plannedQuantity ?? null,
        quantityUnit: item.quantityUnit || "Adet",
        responsibleParty: item.responsibleParty,
        sourceType: "TEMPLATE",
        templateKey: item.key,
        sortOrder: item.sortOrder,
        createdById: userId ?? null,
      })),
      skipDuplicates: true,
    });
  }

  static async create(projectId: string, input: OpeningSupplyInput) {
    validateInput(input);
    const project = await prisma.openingProject.findUnique({ where: { id: projectId }, select: { id: true, branchId: true } });
    if (!project) throw new Error("Açılış projesi bulunamadı.");

    return prisma.openingSupplyItem.create({
      data: {
        openingProjectId: project.id,
        branchId: project.branchId,
        section: input.section,
        category: input.category || defaultCategoryForSection(input.section),
        title: input.title,
        description: input.description || null,
        plannedQuantity: input.plannedQuantity ?? null,
        quantityUnit: input.quantityUnit || "Adet",
        responsibleParty: input.responsibleParty || "ICEBERRY",
        status: input.status || "BEKLIYOR",
        sourceType: "MANUAL",
        createdById: input.createdById ?? null,
      },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async update(itemId: string, input: OpeningSupplyInput, userId?: string | null) {
    validateInput(input);
    return prisma.openingSupplyItem.update({
      where: { id: itemId },
      data: {
        section: input.section,
        category: input.category || defaultCategoryForSection(input.section),
        title: input.title,
        description: input.description || null,
        plannedQuantity: input.plannedQuantity ?? null,
        quantityUnit: input.quantityUnit || "Adet",
        responsibleParty: input.responsibleParty || "ICEBERRY",
        status: input.status || "BEKLIYOR",
        logisticsUpdatedById: userId ?? undefined,
      },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async setLogisticsStatus(itemId: string, status: string, userId?: string | null, note?: string | null) {
    if (!OPENING_SUPPLY_LOGISTICS_STATUSES.some(([value]) => value === status)) throw new Error("Geçersiz tedarik durumu.");
    const trimmedNote = note?.trim() || null;
    const isDelivered = status === "TESLIM_EDILDI";

    return prisma.$transaction(async (tx) => {
      const item = await tx.openingSupplyItem.update({
        where: { id: itemId },
        data: {
          logisticsStatus: status,
          logisticsNote: trimmedNote,
          logisticsUpdatedAt: new Date(),
          logisticsUpdatedById: userId ?? null,
          status: isDelivered ? "TAMAMLANDI" : "DEVAM_EDIYOR",
        },
        select: { openingProjectId: true, branchId: true },
      });
      await tx.openingSupplyItemUpdate.create({ data: { itemId, status, note: trimmedNote, createdById: userId ?? null } });
      return item;
    });
  }

  static async archive(itemId: string) {
    return prisma.openingSupplyItem.update({
      where: { id: itemId },
      data: { archivedAt: new Date() },
      select: { openingProjectId: true, branchId: true },
    });
  }

  static async restore(itemId: string) {
    return prisma.openingSupplyItem.update({
      where: { id: itemId },
      data: { archivedAt: null },
      select: { openingProjectId: true, branchId: true },
    });
  }
}

function validateInput(input: OpeningSupplyInput) {
  if (!OPENING_SUPPLY_SECTIONS.some(([value]) => value === input.section)) throw new Error("Geçersiz ürün sekmesi.");
  if (input.category && !OPENING_SUPPLY_SOURCE_CATEGORIES.some(([value]) => value === input.category)) throw new Error("Geçersiz ürün kaynağı.");
  if (input.responsibleParty && !OPENING_SUPPLY_RESPONSIBLE_PARTIES.some(([value]) => value === input.responsibleParty)) throw new Error("Geçersiz sorumlu taraf.");
  if (input.status && !OPENING_SUPPLY_STATUSES.some(([value]) => value === input.status)) throw new Error("Geçersiz ürün durumu.");
  if (!input.title.trim()) throw new Error("Ürün adı zorunludur.");
}

function defaultCategoryForSection(section: string) {
  return section === "ACILIS_MALI" ? "ICEBERRY_DEPO" : "DIS_ALIM";
}
