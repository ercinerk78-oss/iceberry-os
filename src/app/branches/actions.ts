"use server";

import { revalidatePath } from "next/cache";

import { audit, requirePermission } from "@/lib/auth";
import { BRANCH_STATUSES } from "@/lib/franchise";
import { prisma } from "@/lib/prisma";
import { branchSchema, type FormState } from "@/lib/validations/franchise";

const fields = [
  "franchiseeId",
  "candidateId",
  "sourceLeadId",
  "branchName",
  "branchCode",
  "legalName",
  "tradeName",
  "ownershipType",
  "city",
  "district",
  "address",
  "country",
  "latitude",
  "longitude",
  "phone",
  "email",
  "mallName",
  "floor",
  "unitNumber",
  "squareMeters",
  "authorizedPersonName",
  "authorizedPersonPhone",
  "authorizedPersonEmail",
  "taxOffice",
  "taxNumber",
  "billingAddress",
  "concept",
  "locationType",
  "openingDate",
  "plannedOpeningDate",
  "closingDate",
  "contractStartDate",
  "contractEndDate",
  "leaseStartDate",
  "leaseEndDate",
  "rentAmount",
  "turnoverRentRate",
  "depositAmount",
  "royaltyRate",
  "marketingContributionRate",
  "managerName",
  "managerPhone",
  "managerEmail",
  "operationsManager",
  "status",
  "generalNotes",
] as const;

const dataFrom = (formData: FormData) =>
  Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")]));
const empty = (value?: string) => value || null;
const date = (value?: string) => (value ? new Date(value) : null);
const number = (value?: string) => (value ? Number(value) : null);

function toData(data: ReturnType<typeof branchSchema.parse>, userId?: string) {
  return {
    franchiseeId: empty(data.franchiseeId),
    candidateId: empty(data.candidateId),
    sourceLeadId: empty(data.sourceLeadId),
    branchName: data.branchName,
    branchCode: data.branchCode,
    legalName: empty(data.legalName),
    tradeName: empty(data.tradeName),
    ownershipType: data.ownershipType,
    conceptType: data.concept,
    city: data.city,
    district: empty(data.district),
    address: empty(data.address),
    country: data.country || "Türkiye",
    latitude: number(data.latitude),
    longitude: number(data.longitude),
    phone: empty(data.phone),
    email: empty(data.email),
    mallName: empty(data.mallName),
    floor: empty(data.floor),
    unitNumber: empty(data.unitNumber),
    squareMeters: number(data.squareMeters),
    authorizedPersonName: empty(data.authorizedPersonName),
    authorizedPersonPhone: empty(data.authorizedPersonPhone),
    authorizedPersonEmail: empty(data.authorizedPersonEmail),
    taxOffice: empty(data.taxOffice),
    taxNumber: empty(data.taxNumber),
    billingAddress: empty(data.billingAddress),
    concept: data.concept,
    locationType: data.locationType,
    openingDate: date(data.openingDate),
    plannedOpeningDate: date(data.plannedOpeningDate),
    closingDate: date(data.closingDate),
    contractStartDate: date(data.contractStartDate),
    contractEndDate: date(data.contractEndDate),
    leaseStartDate: date(data.leaseStartDate),
    leaseEndDate: date(data.leaseEndDate),
    rentAmount: number(data.rentAmount),
    turnoverRentRate: number(data.turnoverRentRate),
    depositAmount: number(data.depositAmount),
    royaltyRate: number(data.royaltyRate),
    marketingContributionRate: number(data.marketingContributionRate),
    managerName: empty(data.managerName),
    managerPhone: empty(data.managerPhone),
    managerEmail: empty(data.managerEmail),
    operationsManager: empty(data.operationsManager),
    status: data.status,
    generalNotes: empty(data.generalNotes),
    ...(userId ? { createdById: userId } : {}),
  };
}

function refresh(id?: string) {
  revalidatePath("/branches");
  revalidatePath("/branch-portal");
  revalidatePath("/documents");
  revalidatePath("/");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/branches/${id}`);
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createBranch(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("branches");
  const parsed = branchSchema.safeParse(dataFrom(formData));

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    const branch = await prisma.$transaction(async (tx) => {
      const created = await tx.branch.create({ data: toData(parsed.data, user.id) });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: created.id,
          userId: user.id,
          action: "BRANCH_CREATED",
          entityType: "Branch",
          entityId: created.id,
          description: `${created.branchName} şubesi oluşturuldu.`,
        },
      });
      return created;
    });
    await audit("BRANCH_CREATED", "Branch", branch.id, "Şube oluşturuldu.", user.id);
    refresh(branch.id);

    return { success: true, message: "Şube başarıyla oluşturuldu.", id: branch.id };
  } catch (error) {
    return { success: false, message: isUniqueError(error) ? "Bu şube kodu veya aday bağlantısı zaten kullanılıyor." : "Şube oluşturulamadı." };
  }
}

export async function updateBranch(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("branches");
  const parsed = branchSchema.safeParse(dataFrom(formData));

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    const previous = await prisma.branch.findUnique({ where: { id }, select: { status: true, branchName: true } });
    const branch = await prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({ where: { id }, data: toData(parsed.data) });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: id,
          userId: user.id,
          action: previous?.status !== updated.status ? "BRANCH_STATUS_CHANGED" : "BRANCH_UPDATED",
          entityType: "Branch",
          entityId: id,
          oldValue: previous?.status,
          newValue: updated.status,
          description: previous?.status !== updated.status ? "Şube durumu güncellendi." : "Şube bilgileri güncellendi.",
        },
      });
      return updated;
    });
    await audit("BRANCH_UPDATED", "Branch", id, "Şube bilgileri güncellendi.", user.id);
    refresh(id);

    return { success: true, message: "Şube bilgileri güncellendi.", id: branch.id };
  } catch (error) {
    return { success: false, message: isUniqueError(error) ? "Bu şube kodu başka bir şubede kullanılıyor." : "Şube güncellenemedi." };
  }
}

export async function convertCandidateToBranch(candidateId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("branches");
  const parsed = branchSchema.safeParse({ ...dataFrom(formData), candidateId });

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  try {
    const branch = await prisma.$transaction(async (tx) => {
      const candidate = await tx.franchiseCandidate.findFirst({
        where: { id: candidateId, archivedAt: null },
        select: { id: true, fullName: true, status: true },
      });
      if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
      const existing = await tx.branch.findUnique({ where: { candidateId } });
      if (existing) throw new Error("CANDIDATE_ALREADY_CONVERTED");

      const created = await tx.branch.create({ data: toData({ ...parsed.data, candidateId }, user.id) });
      await tx.franchiseCandidate.update({ where: { id: candidateId }, data: { status: "Şubeye Dönüştürüldü" } });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: created.id,
          userId: user.id,
          action: "CANDIDATE_CONVERTED_TO_BRANCH",
          entityType: "FranchiseCandidate",
          entityId: candidate.id,
          oldValue: candidate.status,
          newValue: "Şubeye Dönüştürüldü",
          description: `${candidate.fullName} franchise adayı şubeye dönüştürüldü.`,
        },
      });

      return created;
    });
    await audit("CANDIDATE_CONVERTED_TO_BRANCH", "Branch", branch.id, "Franchise adayı şubeye dönüştürüldü.", user.id);
    refresh(branch.id);
    revalidatePath(`/candidates/${candidateId}`);
    revalidatePath("/candidates");

    return { success: true, message: "Aday şubeye dönüştürüldü.", id: branch.id };
  } catch (error) {
    const message =
      error instanceof Error && error.message === "CANDIDATE_ALREADY_CONVERTED"
        ? "Bu adaydan daha önce şube oluşturulmuş."
        : error instanceof Error && error.message === "CANDIDATE_NOT_FOUND"
          ? "Aday bulunamadı."
          : isUniqueError(error)
            ? "Bu şube kodu veya aday bağlantısı zaten kullanılıyor."
            : "Aday şubeye dönüştürülemedi.";

    return { success: false, message };
  }
}

export async function archiveBranch(id: string, formData: FormData) {
  void formData;
  const user = await requirePermission("branches");
  await prisma.$transaction([
    prisma.branch.update({ where: { id }, data: { archivedAt: new Date(), status: "PASSIVE" } }),
    prisma.branchTimelineEvent.create({
      data: {
        branchId: id,
        userId: user.id,
        action: "BRANCH_UPDATED",
        entityType: "Branch",
        entityId: id,
        description: "Şube arşivlendi.",
      },
    }),
  ]);
  refresh(id);
}

export async function setBranchStatus(id: string, status: string, formData: FormData) {
  void formData;
  const user = await requirePermission("branches");
  if (!(status in BRANCH_STATUSES)) return;
  const previous = await prisma.branch.findUnique({ where: { id }, select: { status: true } });
  await prisma.$transaction([
    prisma.branch.update({ where: { id }, data: { status } }),
    prisma.branchTimelineEvent.create({
      data: {
        branchId: id,
        userId: user.id,
        action: "BRANCH_STATUS_CHANGED",
        entityType: "Branch",
        entityId: id,
        oldValue: previous?.status,
        newValue: status,
        description: "Şube durumu güncellendi.",
      },
    }),
  ]);
  refresh(id);
}
