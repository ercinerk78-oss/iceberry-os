"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";

import { audit, requirePermission, requireUser } from "@/lib/auth";
import { monthPeriod } from "@/lib/branch-revenue";
import { isMissingRevenueTableError } from "@/lib/branch-revenue-data";
import { canAccessBranch } from "@/lib/branch-access";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { branchRevenueSchema, revenueRejectSchema, type BranchRevenueState } from "@/lib/validations/branch-revenue";

function refresh(branchId?: string, id?: string) {
  revalidatePath("/branch-revenues");
  revalidatePath("/branches");
  if (branchId) revalidatePath(`/branches/${branchId}`);
  if (id) revalidatePath(`/branch-revenues/${id}`);
}

const nullableNumber = (value?: string) => (value ? Number(value) : null);

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function canApprove(role: string) {
  return ["GENERAL_MANAGER", "OPERATIONS_MANAGER"].includes(role);
}

function editableByStatus(status: string, role: string) {
  if (["DRAFT", "REJECTED"].includes(status)) return true;
  if (["SUBMITTED", "APPROVED"].includes(status)) return canApprove(role);
  if (status === "LOCKED") return role === "GENERAL_MANAGER";

  return false;
}

function nextCorrectionStatus(currentStatus: string, submit?: string) {
  if (currentStatus === "LOCKED") return "LOCKED";
  if (["APPROVED", "SUBMITTED"].includes(currentStatus)) return "SUBMITTED";

  return submit ? "SUBMITTED" : "DRAFT";
}

function revenueSnapshot(record: {
  year: number;
  month: number;
  grossRevenue: number;
  netRevenue: number | null;
  targetRevenue: number | null;
  transactionCount: number | null;
  averageTicket: number | null;
  currency: string;
  source: string;
  status: string;
  notes: string | null;
}) {
  return JSON.stringify({
    year: record.year,
    month: record.month,
    grossRevenue: record.grossRevenue,
    netRevenue: record.netRevenue,
    targetRevenue: record.targetRevenue,
    transactionCount: record.transactionCount,
    averageTicket: record.averageTicket,
    currency: record.currency,
    source: record.source,
    status: record.status,
    notes: record.notes,
  });
}

async function maybeStoreSupportDocument(branchId: string, file: File | null, userName: string) {
  if (!file || file.size === 0) return null;
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
  if (!allowed.includes(file.type)) throw new Error("Destekleyici dosya türü geçersiz.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Destekleyici dosya en fazla 25 MB olabilir.");
  const saved = await storage.save(file);

  try {
    return await prisma.document.create({
      data: {
        branchId,
        fileName: saved.fileName,
        originalFileName: path.basename(file.name),
        filePath: saved.filePath,
        mimeType: file.type,
        fileSize: file.size,
        documentType: "OTHER",
        version: "1",
        description: "Ciro destekleyici dosyası",
        uploadedBy: userName,
      },
    });
  } catch (error) {
    await storage.remove(saved.filePath);
    throw error;
  }
}

export async function upsertBranchRevenue(_: BranchRevenueState, formData: FormData): Promise<BranchRevenueState> {
  await requirePermission("branch_revenue");
  const user = await requireUser();
  const parsed = branchRevenueSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  if (!(await canAccessBranch(parsed.data.branchId))) return { success: false, message: "Bu şubenin cirosuna erişim yetkiniz yok." };

  const { periodStart, periodEnd } = monthPeriod(parsed.data.year, parsed.data.month);
  const file = formData.get("supportFile") instanceof File ? formData.get("supportFile") as File : null;

  try {
    const existing = await prisma.branchRevenueRecord.findUnique({
      where: { branchId_periodType_periodStart: { branchId: parsed.data.branchId, periodType: "MONTHLY", periodStart } },
      select: { id: true },
    });
    if (existing) return { success: false, message: "Bu şube ve ay için ciro kaydı zaten var.", id: existing.id };

    const document = await maybeStoreSupportDocument(parsed.data.branchId, file, user.name);
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.branchRevenueRecord.create({
        data: {
          branchId: parsed.data.branchId,
          periodType: "MONTHLY",
          periodStart,
          periodEnd,
          year: parsed.data.year,
          month: parsed.data.month,
          grossRevenue: parsed.data.grossRevenue,
          netRevenue: nullableNumber(parsed.data.netRevenue),
          targetRevenue: nullableNumber(parsed.data.targetRevenue),
          transactionCount: parsed.data.transactionCount ? Number(parsed.data.transactionCount) : null,
          averageTicket: nullableNumber(parsed.data.averageTicket),
          currency: parsed.data.currency,
          source: parsed.data.source,
          status: parsed.data.submit ? "SUBMITTED" : "DRAFT",
          notes: parsed.data.notes || null,
          supportDocumentId: document?.id ?? null,
          enteredById: user.id,
        },
      });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: created.branchId,
          userId: user.id,
          action: parsed.data.submit ? "REVENUE_SUBMITTED" : "REVENUE_CREATED",
          entityType: "BranchRevenueRecord",
          entityId: created.id,
          newValue: `${created.grossRevenue} ${created.currency}`,
          description: parsed.data.submit ? "Ciro kaydı onaya gönderildi." : "Ciro kaydı oluşturuldu.",
        },
      });
      if (document) {
        await tx.branchTimelineEvent.create({
          data: {
            branchId: created.branchId,
            userId: user.id,
            action: "REVENUE_DOCUMENT_ATTACHED",
            entityType: "BranchRevenueRecord",
            entityId: created.id,
            newValue: document.originalFileName,
            description: "Ciro kaydına destekleyici doküman eklendi.",
          },
        });
      }
      return created;
    });
    await audit("REVENUE_CREATED", "BranchRevenueRecord", record.id, "Şube ciro kaydı oluşturuldu.", user.id);
    refresh(record.branchId, record.id);

    return { success: true, message: parsed.data.submit ? "Ciro kaydı onaya gönderildi." : "Ciro kaydı taslak olarak kaydedildi.", id: record.id };
  } catch (error) {
    if (isMissingRevenueTableError(error)) {
      return { success: false, message: "Ciro tablosu production veritabanında henüz hazır değil. DIRECT_URL tanımlandıktan sonra migration uygulanmalı." };
    }

    return { success: false, message: isUniqueError(error) ? "Bu şube ve ay için ciro kaydı zaten var." : error instanceof Error ? error.message : "Ciro kaydı oluşturulamadı." };
  }
}

export async function createBranchRevenue(state: BranchRevenueState, formData: FormData): Promise<BranchRevenueState> {
  return upsertBranchRevenue(state, formData);
}

export async function updateBranchRevenue(id: string, _: BranchRevenueState, formData: FormData): Promise<BranchRevenueState> {
  await requirePermission("branch_revenue");
  const user = await requireUser();
  const parsed = branchRevenueSchema.safeParse(Object.fromEntries(formData));
  const correctionReason = String(formData.get("correctionReason") ?? "").trim();

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  if (correctionReason.length < 5) return { success: false, message: "Düzeltme açıklaması en az 5 karakter olmalı." };
  if (!(await canAccessBranch(parsed.data.branchId))) return { success: false, message: "Bu şubenin cirosuna erişim yetkiniz yok." };

  const { periodStart, periodEnd } = monthPeriod(parsed.data.year, parsed.data.month);
  const file = formData.get("supportFile") instanceof File ? formData.get("supportFile") as File : null;

  try {
    const current = await prisma.branchRevenueRecord.findUnique({ where: { id } });
    if (!current) return { success: false, message: "Ciro kaydı bulunamadı." };
    if (!(await canAccessBranch(current.branchId))) return { success: false, message: "Bu ciro kaydına erişim yetkiniz yok." };
    if (!editableByStatus(current.status, user.role)) {
      return { success: false, message: "Bu durumdaki ciro kaydını düzeltme yetkiniz yok." };
    }

    const conflict = await prisma.branchRevenueRecord.findFirst({
      where: {
        id: { not: id },
        branchId: parsed.data.branchId,
        periodType: "MONTHLY",
        periodStart,
      },
      select: { id: true },
    });
    if (conflict) return { success: false, message: "Seçilen şube ve ay için başka bir ciro kaydı zaten var.", id: conflict.id };

    const document = await maybeStoreSupportDocument(parsed.data.branchId, file, user.name);
    const nextStatus = nextCorrectionStatus(current.status, parsed.data.submit);
    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.branchRevenueRecord.update({
        where: { id },
        data: {
          branchId: parsed.data.branchId,
          periodStart,
          periodEnd,
          year: parsed.data.year,
          month: parsed.data.month,
          grossRevenue: parsed.data.grossRevenue,
          netRevenue: nullableNumber(parsed.data.netRevenue),
          targetRevenue: nullableNumber(parsed.data.targetRevenue),
          transactionCount: parsed.data.transactionCount ? Number(parsed.data.transactionCount) : null,
          averageTicket: nullableNumber(parsed.data.averageTicket),
          currency: parsed.data.currency,
          source: parsed.data.source,
          status: nextStatus,
          notes: parsed.data.notes || null,
          supportDocumentId: document?.id ?? current.supportDocumentId,
          approvedById: ["APPROVED", "LOCKED"].includes(nextStatus) ? current.approvedById : null,
          approvedAt: ["APPROVED", "LOCKED"].includes(nextStatus) ? current.approvedAt : null,
          lockedAt: nextStatus === "LOCKED" ? current.lockedAt : null,
          rejectionReason: null,
          enteredById: user.id,
        },
      });
      await tx.branchTimelineEvent.create({
        data: {
          branchId: updated.branchId,
          userId: user.id,
          action: "REVENUE_CORRECTED",
          entityType: "BranchRevenueRecord",
          entityId: updated.id,
          oldValue: revenueSnapshot(current),
          newValue: revenueSnapshot(updated),
          description: `Ciro kaydı düzeltildi: ${correctionReason}`,
        },
      });
      if (document) {
        await tx.branchTimelineEvent.create({
          data: {
            branchId: updated.branchId,
            userId: user.id,
            action: "REVENUE_DOCUMENT_ATTACHED",
            entityType: "BranchRevenueRecord",
            entityId: updated.id,
            newValue: document.originalFileName,
            description: "Düzeltme sırasında yeni destekleyici doküman eklendi.",
          },
        });
      }

      return updated;
    });
    await audit("REVENUE_CORRECTED", "BranchRevenueRecord", record.id, `Şube ciro kaydı düzeltildi: ${correctionReason}`, user.id);
    refresh(record.branchId, record.id);

    return { success: true, message: nextStatus === "SUBMITTED" ? "Ciro kaydı düzeltildi ve onaya alındı." : "Ciro kaydı düzeltildi.", id: record.id };
  } catch (error) {
    if (isMissingRevenueTableError(error)) {
      return { success: false, message: "Ciro tablosu production veritabanında henüz hazır değil. DIRECT_URL tanımlandıktan sonra migration uygulanmalı." };
    }

    return { success: false, message: isUniqueError(error) ? "Seçilen şube ve ay için başka bir ciro kaydı zaten var." : error instanceof Error ? error.message : "Ciro kaydı düzeltilemedi." };
  }
}

export async function approveRevenue(id: string, formData: FormData) {
  void formData;
  await requirePermission("branch_revenue");
  const user = await requireUser();
  if (!canApprove(user.role)) throw new Error("Ciro onaylama yetkiniz yok.");
  const current = await prisma.branchRevenueRecord.findUnique({ where: { id } });
  if (!current) return;
  const record = await prisma.branchRevenueRecord.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date(), rejectionReason: null },
  });
  await prisma.branchTimelineEvent.create({
    data: { branchId: record.branchId, userId: user.id, action: "REVENUE_APPROVED", entityType: "BranchRevenueRecord", entityId: id, oldValue: current.status, newValue: "APPROVED", description: "Ciro kaydı onaylandı." },
  });
  await audit("REVENUE_APPROVED", "BranchRevenueRecord", id, "Ciro kaydı onaylandı.", user.id);
  refresh(record.branchId, id);
}

export async function rejectRevenue(id: string, formData: FormData) {
  await requirePermission("branch_revenue");
  const user = await requireUser();
  if (!canApprove(user.role)) throw new Error("Ciro reddetme yetkiniz yok.");
  const parsed = revenueRejectSchema.parse(Object.fromEntries(formData));
  const current = await prisma.branchRevenueRecord.findUnique({ where: { id } });
  if (!current) return;
  const record = await prisma.branchRevenueRecord.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: parsed.rejectionReason, approvedById: null, approvedAt: null },
  });
  await prisma.branchTimelineEvent.create({
    data: { branchId: record.branchId, userId: user.id, action: "REVENUE_REJECTED", entityType: "BranchRevenueRecord", entityId: id, oldValue: current.status, newValue: "REJECTED", description: `Ciro kaydı reddedildi: ${parsed.rejectionReason}` },
  });
  await audit("REVENUE_REJECTED", "BranchRevenueRecord", id, "Ciro kaydı reddedildi.", user.id);
  refresh(record.branchId, id);
}

export async function lockRevenue(id: string, formData: FormData) {
  void formData;
  await requirePermission("branch_revenue");
  const user = await requireUser();
  if (user.role !== "GENERAL_MANAGER") throw new Error("Ciro kilitleme yetkiniz yok.");
  const current = await prisma.branchRevenueRecord.findUnique({ where: { id } });
  if (!current) return;
  const record = await prisma.branchRevenueRecord.update({ where: { id }, data: { status: "LOCKED", lockedAt: new Date() } });
  await prisma.branchTimelineEvent.create({
    data: { branchId: record.branchId, userId: user.id, action: "REVENUE_LOCKED", entityType: "BranchRevenueRecord", entityId: id, oldValue: current.status, newValue: "LOCKED", description: "Ciro dönemi kilitlendi." },
  });
  await audit("REVENUE_LOCKED", "BranchRevenueRecord", id, "Ciro kaydı kilitlendi.", user.id);
  refresh(record.branchId, id);
}
