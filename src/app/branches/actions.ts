"use server";

import { revalidatePath } from "next/cache";

import { audit, requirePermission } from "@/lib/auth";
import { BRANCH_STATUSES } from "@/lib/franchise";
import { prisma } from "@/lib/prisma";
import { branchSchema, type FormState } from "@/lib/validations/franchise";

const fields = [
  "franchiseeId",
  "branchName",
  "city",
  "district",
  "address",
  "conceptId",
  "concept",
  "locationType",
  "openingDate",
  "plannedOpeningDate",
  "royaltyRate",
  "marketingContributionRate",
  "operationsManager",
  "status",
  "generalNotes",
] as const;

const dataFrom = (formData: FormData) =>
  Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")]));
const empty = (value?: string) => value || null;
const date = (value?: string) => (value ? new Date(value) : null);
const number = (value?: string) => (value ? Number(value) : null);

async function conceptForWrite(conceptId: string, options?: { currentConceptId?: string | null; allowInactive?: boolean }) {
  const concept = await prisma.branchConcept.findUnique({
    where: { id: conceptId },
    select: { id: true, code: true, name: true, isActive: true },
  });

  if (!concept) throw new Error("Seçilen konsept bulunamadı.");
  const keepsCurrentInactive = options?.allowInactive && options.currentConceptId === concept.id;
  if (!concept.isActive && !keepsCurrentInactive) throw new Error("Pasif konsept yeni şube kaydında kullanılamaz.");

  return concept;
}

async function toData(data: ReturnType<typeof branchSchema.parse>, concept: Awaited<ReturnType<typeof conceptForWrite>>) {
  return {
    franchiseeId: empty(data.franchiseeId),
    branchName: data.branchName,
    city: data.city,
    district: empty(data.district),
    address: empty(data.address),
    conceptId: concept.id,
    concept: concept.code,
    conceptType: concept.code,
    locationType: data.locationType,
    openingDate: date(data.openingDate),
    plannedOpeningDate: date(data.plannedOpeningDate),
    royaltyRate: number(data.royaltyRate),
    marketingContributionRate: number(data.marketingContributionRate),
    operationsManager: empty(data.operationsManager),
    status: data.status,
    generalNotes: empty(data.generalNotes),
  };
}

function refresh(id?: string) {
  revalidatePath("/branches");
  revalidatePath("/branch-map");
  revalidatePath("/branch-revenues");
  revalidatePath("/documents");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (id) revalidatePath(`/branches/${id}`);
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function friendlyError(error: unknown, fallback: string) {
  if (isUniqueError(error)) return "Bu şube kaydı zaten kullanılıyor.";
  if (error instanceof Error && error.message.includes("Unknown argument")) {
    return "Production veritabanı şeması bu alanı henüz desteklemiyor.";
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function createTimelineEvent(data: {
  branchId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string | null;
  newValue?: string | null;
  description: string;
}) {
  try {
    await prisma.branchTimelineEvent.create({ data });
  } catch (error) {
    console.warn("[branches] BranchTimelineEvent kaydedilemedi.", error);
  }
}

export async function createBranch(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("branches");
  const parsed = branchSchema.safeParse(dataFrom(formData));

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    const concept = await conceptForWrite(parsed.data.conceptId);
    const branch = await prisma.branch.create({ data: await toData(parsed.data, concept) });
    await createTimelineEvent({
      branchId: branch.id,
      userId: user.id,
      action: "BRANCH_CREATED",
      entityType: "Branch",
      entityId: branch.id,
      description: `${branch.branchName} şubesi oluşturuldu.`,
    });
    await audit("BRANCH_CREATED", "Branch", branch.id, "Şube oluşturuldu.", user.id);
    refresh(branch.id);

    return { success: true, message: "Şube başarıyla oluşturuldu.", id: branch.id };
  } catch (error) {
    return { success: false, message: friendlyError(error, "Şube oluşturulamadı.") };
  }
}

export async function updateBranch(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("branches");
  const parsed = branchSchema.safeParse(dataFrom(formData));

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    const previous = await prisma.branch.findUnique({ where: { id }, select: { status: true, branchName: true, conceptId: true } });
    const concept = await conceptForWrite(parsed.data.conceptId, { currentConceptId: previous?.conceptId, allowInactive: true });
    const branch = await prisma.branch.update({ where: { id }, data: await toData(parsed.data, concept) });
    await createTimelineEvent({
      branchId: id,
      userId: user.id,
      action: previous?.status !== branch.status ? "BRANCH_STATUS_CHANGED" : "BRANCH_UPDATED",
      entityType: "Branch",
      entityId: id,
      oldValue: previous?.status,
      newValue: branch.status,
      description: previous?.status !== branch.status ? "Şube durumu güncellendi." : "Şube bilgileri güncellendi.",
    });
    await audit("BRANCH_UPDATED", "Branch", id, "Şube bilgileri güncellendi.", user.id);
    refresh(id);

    return { success: true, message: "Şube bilgileri güncellendi.", id: branch.id };
  } catch (error) {
    return { success: false, message: friendlyError(error, "Şube güncellenemedi.") };
  }
}

export async function convertCandidateToBranch(candidateId: string, _: FormState, formData: FormData): Promise<FormState> {
  void candidateId;
  void formData;
  return {
    success: false,
    message: "Adaydan şubeye dönüştürme için production migration tamamlanmalı.",
  };
}

export async function archiveBranch(id: string, formData: FormData) {
  void formData;
  const user = await requirePermission("branches");
  await prisma.branch.update({ where: { id }, data: { archivedAt: new Date(), status: "PASSIVE" } });
  await createTimelineEvent({
    branchId: id,
    userId: user.id,
    action: "BRANCH_UPDATED",
    entityType: "Branch",
    entityId: id,
    description: "Şube arşivlendi.",
  });
  refresh(id);
}

export async function setBranchStatus(id: string, status: string, formData: FormData) {
  void formData;
  const user = await requirePermission("branches");
  if (!(status in BRANCH_STATUSES)) return;
  const previous = await prisma.branch.findUnique({ where: { id }, select: { status: true } });
  await prisma.branch.update({ where: { id }, data: { status } });
  await createTimelineEvent({
    branchId: id,
    userId: user.id,
    action: "BRANCH_STATUS_CHANGED",
    entityType: "Branch",
    entityId: id,
    oldValue: previous?.status,
    newValue: status,
    description: "Şube durumu güncellendi.",
  });
  refresh(id);
}
