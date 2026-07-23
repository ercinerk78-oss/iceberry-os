"use server";

import { revalidatePath } from "next/cache";

import { audit, requirePermission } from "@/lib/auth";
import { BRANCH_STATUSES } from "@/lib/franchise";
import { activeProjectStatuses, OpeningProjectService } from "@/lib/opening-project-service";
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
  const user = await requirePermission("branches");
  await requirePermission("openings");
  const parsed = branchSchema.safeParse(dataFrom(formData));
  const targetOpeningDate = String(formData.get("targetOpeningDate") || formData.get("plannedOpeningDate") || "");
  const openingCoordinatorId = empty(String(formData.get("openingCoordinatorId") || ""));

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  if (!targetOpeningDate || Number.isNaN(Date.parse(targetOpeningDate))) {
    return { success: false, message: "Hedef açılış tarihi zorunludur." };
  }

  try {
    const concept = await conceptForWrite(parsed.data.conceptId);
    const result = await prisma.$transaction(async (tx) => {
      const candidate = await tx.franchiseCandidate.findFirst({
        where: { id: candidateId, archivedAt: null },
        include: {
          branch: { select: { id: true, branchName: true } },
          openingProjects: {
            where: { archivedAt: null, status: { in: activeProjectStatuses } },
            select: { id: true, projectNumber: true },
            take: 1,
          },
        },
      });
      if (!candidate) throw new Error("Aday bulunamadı.");
      if (candidate.branch) {
        const existingProject = candidate.openingProjects[0] ?? await tx.openingProject.findFirst({
          where: { branchId: candidate.branch.id, archivedAt: null, status: { in: activeProjectStatuses } },
          select: { id: true, projectNumber: true },
        });
        return {
          branchId: candidate.branch.id,
          openingProjectId: existingProject?.id,
          projectNumber: existingProject?.projectNumber,
          alreadyConverted: true,
        };
      }
      if (candidate.openingProjects.length) {
        throw new Error("Bu aday için aktif açılış projesi zaten var. Lütfen mevcut projeyi kontrol edin.");
      }

      const lead = await tx.lead.findFirst({ where: { convertedCandidateId: candidate.id }, select: { id: true } });
      const branch = await tx.branch.create({
        data: {
          ...(await toData(parsed.data, concept)),
          candidateId: candidate.id,
          sourceLeadId: lead?.id ?? null,
          phone: candidate.phone,
          email: candidate.email,
          authorizedPersonName: candidate.fullName,
          authorizedPersonPhone: candidate.phone,
          authorizedPersonEmail: candidate.email,
          status: "IN_SETUP",
          plannedOpeningDate: new Date(targetOpeningDate),
          generalNotes: [
            parsed.data.generalNotes,
            candidate.investmentBudget ? `Yatırım bütçesi: ${candidate.investmentBudget} ${candidate.currency}` : null,
            candidate.generalNotes ? `Aday notu: ${candidate.generalNotes}` : null,
          ].filter(Boolean).join("\n"),
        },
      });

      const project = await OpeningProjectService.createFromBranchInTransaction(tx, {
        branchId: branch.id,
        targetOpeningDate: new Date(targetOpeningDate),
        plannedStartDate: new Date(),
        openingCoordinatorId,
        projectManagerId: openingCoordinatorId,
        plannedBudget: parseBudget(candidate.investmentBudget),
        description: [
          "Kaynak: Franchise dönüşümü",
          lead?.id ? `Lead ID: ${lead.id}` : null,
          candidate.generalNotes,
        ].filter(Boolean).join("\n"),
        createdById: user.id,
      });

      await tx.franchiseCandidate.update({
        where: { id: candidate.id },
        data: { status: "Şubeye Dönüştürüldü", lastContactAt: new Date(), nextFollowUpAt: null },
      });
      await tx.candidateTimelineEvent.create({
        data: {
          candidateId: candidate.id,
          eventType: "CONVERTED_TO_BRANCH",
          title: "Aday şubeye dönüştürüldü",
          description: `${branch.branchName} şubesi ve ${project.projectNumber} numaralı açılış projesi oluşturuldu.`,
          actorName: user.name,
          metadata: JSON.stringify({ branchId: branch.id, openingProjectId: project.id, leadId: lead?.id ?? null }),
        },
      });
      if (lead) {
        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: "CONVERTED_TO_BRANCH",
            description: `${candidate.fullName} için şube ve açılış projesi oluşturuldu.`,
          },
        });
      }

      return { branchId: branch.id, openingProjectId: project.id, projectNumber: project.projectNumber, alreadyConverted: false };
    });

    await audit("CANDIDATE_CONVERTED_TO_BRANCH", "FranchiseCandidate", candidateId, "Aday şubeye ve açılış projesine dönüştürüldü.", user.id);
    refresh(result.branchId);
    revalidatePath("/candidates");
    revalidatePath(`/candidates/${candidateId}`);
    revalidatePath("/openings");
    if (result.openingProjectId) revalidatePath(`/openings/${result.openingProjectId}`);

    return {
      success: true,
      message: result.alreadyConverted
        ? "Bu aday daha önce şubeye dönüştürülmüş. Mevcut kayıtlar açılabilir."
        : `Aday şubeye dönüştürüldü ve ${result.projectNumber} numaralı açılış projesi oluşturuldu.`,
      id: result.openingProjectId ?? result.branchId,
      redirectHref: result.openingProjectId ? `/openings/${result.openingProjectId}` : `/branches/${result.branchId}`,
      linkLabel: result.openingProjectId ? "Açılış projesini aç" : "Şube kaydını aç",
    };
  } catch (error) {
    return { success: false, message: friendlyError(error, "Aday şubeye dönüştürülemedi.") };
  }
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

function parseBudget(value?: string | null) {
  const text = String(value ?? "").replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
